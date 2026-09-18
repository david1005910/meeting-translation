import OpenAI from 'openai';

let client: OpenAI | null = null;
let sttClient: OpenAI | null = null;

// API 키가 없어도 서버는 떠야 한다. (STT/TTS를 쓰는 순간에만 실패)
// 모듈 로드 시점에 new OpenAI()를 하면 키가 없을 때 프로세스가 죽는다.
export function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY가 설정되지 않았습니다. 설정 파일(.env)에 키를 넣고 다시 실행하세요.'
    );
  }
  if (!client) {
    client = new OpenAI({ apiKey });
  }
  return client;
}

// STT 전용 클라이언트.
// STT_URL(=로컬 faster-whisper 서버 또는 Groq 등 OpenAI 호환 엔드포인트)이
// 설정돼 있으면 그쪽을 쓰고, 없으면(기존 동작) OpenAI Whisper API를 쓴다.
export function getSTTClient(): OpenAI {
  const url = process.env.STT_URL;
  if (url) {
    if (!sttClient) {
      // 로컬 서버는 인증이 없으므로 아무 키나 넣는다. (OpenAI SDK는 apiKey 필수)
      // timeout을 길게 잡는다 — 최대 3시간 회의 녹음은 로컬 CPU 인퍼런스가 수 분~수 시간 걸릴 수 있다.
      sttClient = new OpenAI({
        apiKey: process.env.STT_API_KEY || 'local-stt',
        baseURL: url,
        timeout: 180 * 60 * 1000, // 3시간 (기본값 10분으로는 긴 녹음이 중간에 끊긴다)
      });
    }
    return sttClient;
  }
  return getOpenAI();
}
