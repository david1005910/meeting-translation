"""MultiMeet 로컬 STT 서버 (faster-whisper 기반).

OpenAI Whisper API와 호환되는 POST /v1/audio/transcriptions 엔드포인트를 제공한다.
백엔드(Node.js)가 여기를 OpenAI SDK로 호출하므로 코드 수정 없이 전환 가능하다.

실행:
    STT_MODEL=medium python -m uvicorn server:app --app-dir backend/stt --host 127.0.0.1 --port 8010

환경변수:
    STT_MODEL   Whisper 모델 크기 (tiny/base/small/medium/large-v3, 기본 small — CPU 실사용 권장)
    STT_DEVICE  cpu 또는 cuda (기본 cpu)
    STT_COMPUTE int8 / float16 / float32 (기본 int8)
    STT_PORT    리슨 포트 (기본 8010)
"""

import os
import tempfile
import threading
from pathlib import Path

import uvicorn
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import PlainTextResponse

MODEL = os.environ.get("STT_MODEL", "small")
DEVICE = os.environ.get("STT_DEVICE", "cpu")
COMPUTE_TYPE = os.environ.get("STT_COMPUTE", "int8")
BEAM_SIZE = int(os.environ.get("STT_BEAM", "5"))
PORT = int(os.environ.get("STT_PORT", "8010"))

VALID_FORMATS = ("json", "text", "verbose_json")

_lock = threading.Lock()
_model = None


def get_model():
    """지연 로딩. 최초 요청 때 모델을 메모리에 올린다 (다운로드는 최초 1회)."""
    global _model
    if _model is None:
        from faster_whisper import WhisperModel

        print(f"[STT] 모델 로딩 시작: {MODEL} (device={DEVICE}, compute={COMPUTE_TYPE})")
        _model = WhisperModel(MODEL, device=DEVICE, compute_type=COMPUTE_TYPE)
        print("[STT] 모델 로딩 완료")
    return _model


app = FastAPI(title="MultiMeet Local STT")


@app.on_event("startup")
def warmup():
    """첫 요청이 아닌 서버 시작 시 모델을 미리 로드한다.
    small 모델은 수 초 안에 로드되며, 첫 사용자 요청이 로드 비용을 기다리지 않게 된다."""
    threading.Thread(target=get_model, daemon=True).start()


@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL}


@app.post("/v1/audio/transcriptions")
def transcribe(
    file: UploadFile = File(...),
    model: str = Form("whisper-1"),  # 무시됨 — 항상 서버가 로드한 모델 사용
    language: str | None = Form(default=None),
    prompt: str | None = Form(default=None),
    response_format: str = Form(default="json"),
    temperature: float = Form(default=0.0),
    timestamp_granularities: list[str] | None = Form(default=None, alias="timestamp_granularities[]"),
):
    if response_format not in VALID_FORMATS:
        raise HTTPException(400, f"지원하지 않는 response_format: {response_format} (허용: {', '.join(VALID_FORMATS)})")

    suffix = Path(file.filename or "audio.wav").suffix or ".wav"
    fd, tmp_path = tempfile.mkstemp(suffix=suffix)
    try:
        with os.fdopen(fd, "wb") as f:
            f.write(file.file.read())

        with _lock:  # 단일 모델 + 다중 요청 동시성 방지 (CPU 인퍼런스)
            m = get_model()
            segments_gen, info = m.transcribe(
                tmp_path,
                language=language or None,
                initial_prompt=prompt or None,
                beam_size=BEAM_SIZE,
                vad_filter=True,
                temperature=temperature,
            )
            segments = list(segments_gen)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(500, f"STT 실패: {exc}")
    finally:
        os.unlink(tmp_path)

    full_text = " ".join(s.text.strip() for s in segments).strip()

    if response_format == "text":
        return PlainTextResponse(full_text)

    if response_format == "verbose_json":
        return {
            "task": "transcribe",
            "language": info.language,
            "language_probability": round(info.language_probability, 4),
            "duration": round(info.duration, 3),
            "text": full_text,
            "segments": [
                {
                    "id": idx,
                    "seek": seg.seek,
                    "start": round(seg.start, 3),
                    "end": round(seg.end, 3),
                    "text": seg.text.strip(),
                    "tokens": seg.tokens,
                    "temperature": round(seg.temperature, 3) if seg.temperature is not None else temperature,
                    "avg_logprob": round(seg.avg_logprob, 4),
                    "compression_ratio": round(seg.compression_ratio, 4),
                    "no_speech_prob": round(seg.no_speech_prob, 4),
                }
                for idx, seg in enumerate(segments)
            ],
        }

    return {"text": full_text}


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=PORT)