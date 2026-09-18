# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

**구현 완료** — 전체 소스코드가 작성되어 실행 가능한 상태.

## What This Project Is

**MultiMeet** is a multilingual meeting interpretation and transcription system for B2B sales professionals. Supports real-time translation and meeting minutes generation for meetings in English, Mandarin Chinese, and Vietnamese, with all output in Korean.

**Two core modes:**
- **Minutes Mode**: Upload/record audio → Whisper STT → Ollama LLM summarization → Korean meeting minutes (DOCX/MD download)
- **Interpretation Mode**: Live microphone → 5s audio chunks → Whisper STT → Ollama translation → real-time dual-panel display

## Running the Project

```bash
# 1. Ollama 시작
brew services start ollama

# 2. 서버 실행 (프로젝트 루트에서) — 백엔드 + 프론트엔드 + 로컬 STT 모두 시작
npm run dev
# STT 서버만 따로: npm run stt   (최초 실행 시 venv 생성 + 의존성 설치 + 모델 다운로드 자동)

# 3. 접속
# 프론트엔드: http://localhost:5173
# 백엔드 API: http://localhost:3001
# 로컬 STT:   http://127.0.0.1:8010  (faster-whisper, OpenAI 호환 /v1/audio/transcriptions)
# Prisma Studio: npm run db:studio
```

DB는 SQLite 파일(`backend/prisma/multimeet.db`)이라 별도 서비스 기동이 필요 없다.

## Tech Stack

**Frontend:** React 18 + TypeScript + Vite + TailwindCSS + Zustand + React Query + Socket.io-client
**Backend:** Node.js 20 + Express + TypeScript + Prisma (SQLite) + Socket.io
**STT:** 로컬 faster-whisper (`backend/stt/`, FastAPI 사이드카 서버, 기본 `small` 모델 — CPU 실사용용. `medium`은 8GB 머신에서 실시간 0.18배로 비현실적) — OpenAI 호환 API라 Node 쪽은 baseURL만 바꿈. `STT_URL` 미설정 시 OpenAI Whisper(유료)로 폴백
**TTS:** OpenAI API (`tts-1`) — `OPENAI_API_KEY` 필요
**LLM:** Ollama (`gemma3:4b` 로컬 실행) — 번역 및 회의록 생성
**Infrastructure:** 없음. 단일 exe 배포를 위해 PostgreSQL/Redis/Docker를 모두 제거했다.

## Key Files

```
backend/src/
  server.ts              # HTTP + Socket.IO 진입점
  app.ts                 # Express 라우팅
  services/
    whisper.service.ts   # Whisper STT (toFile()로 MIME 명시)
    claude.service.ts    # Ollama 번역/회의록 (fetch 기반)
    meeting.service.ts   # 회의 CRUD + JSON 필드 직렬화 담당
  socket/socketHandler.ts # 실시간 통역 WebSocket
  utils/
    socket.ts            # io 싱글톤 (순환참조 방지)
    env.ts               # .env 탐색 (exe 옆 → 데이터 폴더 → cwd)
    paths.ts             # 개발/exe 경로 분기. 경로는 전부 여기서만 만든다
    bootstrap.ts         # 스냅샷 리소스 추출 + 환경변수 확정 (prisma보다 먼저 실행)
    initDb.ts            # 최초 실행 시 init.sql로 테이블 생성
    openai.ts            # getOpenAI() + getSTTClient(): OpenAI 클라이언트 lazy 생성 (STT_URL 있으면 로컬 STT로 라우팅)

backend/stt/
  server.py              # 로컬 STT 서버 (faster-whisper, FastAPI). OpenAI 호환 /v1/audio/transcriptions
  requirements.txt       # faster-whisper, fastapi, uvicorn

frontend/src/
  hooks/useRealtimeInterpret.ts  # 5초마다 recorder 재시작 (완전한 WebM)
  pages/MinutesMode.tsx          # WebSocket으로 STT 완료 대기
  services/apiBase.ts            # 프로덕션은 window.location.origin 사용
```

## Environment Variables (backend/.env)

```
DATABASE_URL="file:./multimeet.db"   # prisma CLI 기준 경로 = backend/prisma/
JWT_SECRET="..."
OPENAI_API_KEY="sk-..."              # TTS용. STT를 로컬 서버로 쓰면 불필요
OLLAMA_URL="http://localhost:11434"
OLLAMA_MODEL="gemma3:4b"
STT_URL="http://127.0.0.1:8010/v1"   # 로컬 faster-whisper. 주석 처리 시 OpenAI Whisper로 폴백
FRONTEND_URL="http://localhost:5173"
UPLOAD_DIR="./uploads"
```

## Architecture Notes

- **npm workspaces** — 모든 패키지는 루트 `node_modules/`에 호이스팅
- **Whisper 파일 전달** — `toFile(stream, filename, {type: mimeType})` 필수 (MIME 미지정 시 400 에러)
- **실시간 통역 WebM** — `MediaRecorder.start()` 후 5초마다 재시작해 완전한 파일 생성 (timeslice 방식의 partial chunk는 Whisper 거부)
- **STT 완료 감지** — MinutesMode에서 Socket.io `transcribe:complete` 이벤트로 대기 (polling 방식 제거)
- **io 순환참조** — `server.ts`에서 `setIo()`, 다른 파일에서 `getIo()` 사용
- **OpenAI/STT 클라이언트는 lazy** — `utils/openai.ts`의 `getOpenAI()`/`getSTTClient()`. 모듈 로드 시점에 `new OpenAI()`를 하면 키가 없는 PC에서 서버가 아예 뜨지 않는다
- **STT 라우팅** — `getSTTClient()`가 `STT_URL`(로컬 faster-whisper 등 OpenAI 호환 엔드포인트)을 읽어 자동 분기. 미설정 시 OpenAI Whisper 폴백. 로컬 서버는 verbose_json에 `no_speech_prob`를 포함하므로 무음 필터 계약이 유지된다

### SQLite 제약과 직렬화

SQLite 커넥터는 스칼라 배열도 `Json` 타입도 지원하지 않는다. 둘 다 `String`으로 저장하고
**`meeting.service.ts`에서만** 직렬화/역직렬화해서 API 응답 모양은 예전 그대로 유지한다.

| 필드 | DB | API |
|---|---|---|
| `Meeting.participants` | JSON 문자열 | `string[]` |
| `Transcript.segments` | JSON 문자열 | `TranscriptSegment[]` |

모든 회의 조회가 `meetingService`를 거치므로 서비스 계층 변환만으로 충분하다.
`audio.controller.ts`가 transcript를 저장할 때만 직접 `JSON.stringify`한다.

`mode: 'insensitive'`는 SQLite에서 지원되지 않으니 추가하지 말 것. SQLite `LIKE`는 ASCII 범위에서 이미 대소문자를 구분하지 않는다.

## Windows 배포 빌드

```bash
npm run build:win      # dist-win/MultiMeet.exe (단일 파일, ~132MB)
npm run package:win    # 위 + MultiMeet-Windows-x64.zip 압축
```

**결과물은 exe 하나다.** Node 18 런타임, 백엔드, 빌드된 프론트엔드,
Prisma Windows 쿼리 엔진, `prisma/init.sql`이 모두 안에 들어 있다.
외부 실행 요소: Ollama + (STT를 로컬로 쓰는 경우) Python faster-whisper 서버.
Windows 배포에서 STT 서버(Python)를 exe에 넣는 작업은 아직 미완 — 현재는
별도로 `python -m uvicorn server:app --app-dir backend/stt ...`를 띄워야 한다.

### 런타임 동작 (`utils/bootstrap.ts`)

pkg 스냅샷은 읽기 전용이고 `.node` 바이너리는 스냅샷에서 `require`할 수 없다.
그래서 빌드 때 `backend/bundled/`에 모아 pkg asset으로 넣고, 최초 실행 시 디스크로 꺼낸다.

데이터 폴더: `%LOCALAPPDATA%\MultiMeet` (macOS/Linux는 `~/.multimeet`, `MULTIMEET_DATA_DIR`로 재지정 가능)

```
multimeet.db   최초 실행 시 initDb.ts가 init.sql로 생성
uploads/       오디오 파일
.env           없으면 bootstrap이 템플릿 생성 (JWT_SECRET 랜덤)
runtime/       스냅샷에서 꺼낸 쿼리 엔진 + public/
```

### 깨지기 쉬운 지점

- **import 순서가 계약이다.** `paths.ts` → `env.ts`, `prisma.ts` → `bootstrap.ts`.
  bootstrap이 `PRISMA_QUERY_ENGINE_LIBRARY`와 절대경로 `DATABASE_URL`을 세팅한 뒤에만
  `new PrismaClient()`가 실행되어야 한다.
- **SQLite 상대경로는 exe에서 못 쓴다.** Prisma가 `file:./x.db`를 schema.prisma 위치(=스냅샷) 기준으로 풀기 때문에
  bootstrap에서 절대경로로 덮어쓴다.
- `schema.prisma`의 `binaryTargets = ["native", "windows"]` 를 지우면 Windows 엔진이 생성되지 않아 exe가 런타임에 죽는다.
- `frontend/.env`의 `VITE_API_URL`이 번들에 박히지 않도록 `frontend/.env.production`에서 빈 값으로 덮는다.
- pkg는 Node 18까지만 지원한다. 타깃을 node20으로 올리면 안 된다.

## Database

```bash
# 스키마 변경 후 (backend/ 에서)
../node_modules/.bin/prisma migrate dev --name <name>

# DB 확인
npm run db:studio
```

마이그레이션과 별개로, 배포본은 `prisma/init.sql`로 테이블을 만든다.
이 파일은 `build-windows.js`가 `prisma migrate diff --from-empty`로 매번 재생성하므로
손으로 고치거나 커밋할 필요가 없다.
