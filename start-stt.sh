#!/bin/bash
# MultiMeet 로컬 STT 서버 시작 (faster-whisper)
# 최초 실행 시 venv 생성 + 의존성 설치 + 모델 다운로드가 자동으로 이뤄진다.
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
VENV="$DIR/backend/stt/.venv"
STT_PORT="${STT_PORT:-8010}"

if [ ! -d "$VENV" ]; then
  echo "[STT] Python venv 생성 중..."
  python3 -m venv "$VENV"
  echo "[STT] 의존성 설치 중 (faster-whisper, fastapi, uvicorn)..."
  "$VENV/bin/pip" install -q --upgrade pip
  "$VENV/bin/pip" install -q -r "$DIR/backend/stt/requirements.txt"
fi

echo "[STT] 로컬 STT 서버 시작: http://127.0.0.1:$STT_PORT (모델: ${STT_MODEL:-small})"
exec "$VENV/bin/python" -m uvicorn server:app \
  --app-dir "$DIR/backend/stt" \
  --host 127.0.0.1 \
  --port "$STT_PORT"