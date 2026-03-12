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
# 1. 서비스 시작 (PostgreSQL, Redis, Ollama)
brew services start postgresql@15
brew services start redis
brew services start ollama

# 2. 서버 실행 (프로젝트 루트에서)
npm run dev
# 또는 각각:
# backend/: ../node_modules/.bin/nodemon
# frontend/: ../node_modules/.bin/vite

# 3. 접속
# 프론트엔드: http://localhost:5173
# 백엔드 API: http://localhost:3001
# Prisma Studio: cd backend && ../node_modules/.bin/prisma studio
```

## Tech Stack

**Frontend:** React 18 + TypeScript + Vite + TailwindCSS + Zustand + React Query + Socket.io-client
**Backend:** Node.js 20 + Express + TypeScript + Prisma (PostgreSQL 15) + Socket.io
**STT:** OpenAI Whisper API (`whisper-1`) — `OPENAI_API_KEY` 필요
**LLM:** Ollama (`gemma3:4b` 로컬 실행) — 번역 및 회의록 생성
**Infrastructure:** PostgreSQL 15 + Redis (Homebrew), Docker 없음

## Key Files

```
backend/src/
  server.ts              # HTTP + Socket.IO 진입점
  app.ts                 # Express 라우팅
  services/
    whisper.service.ts   # Whisper STT (toFile()로 MIME 명시)
    claude.service.ts    # Ollama 번역/회의록 (fetch 기반)
  socket/socketHandler.ts # 실시간 통역 WebSocket
  utils/socket.ts        # io 싱글톤 (순환참조 방지)

frontend/src/
  hooks/useRealtimeInterpret.ts  # 5초마다 recorder 재시작 (완전한 WebM)
  pages/MinutesMode.tsx          # WebSocket으로 STT 완료 대기
```

## Environment Variables (backend/.env)

```
DATABASE_URL="postgresql://david@localhost:5432/multimeet"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="..."
OPENAI_API_KEY="sk-..."         # Whisper STT용
OLLAMA_URL="http://localhost:11434"
OLLAMA_MODEL="gemma3:4b"
FRONTEND_URL="http://localhost:5173"
UPLOAD_DIR="./uploads"
```

## Architecture Notes

- **npm workspaces** — 모든 패키지는 루트 `node_modules/`에 호이스팅
- **Whisper 파일 전달** — `toFile(stream, filename, {type: mimeType})` 필수 (MIME 미지정 시 400 에러)
- **실시간 통역 WebM** — `MediaRecorder.start()` 후 5초마다 재시작해 완전한 파일 생성 (timeslice 방식의 partial chunk는 Whisper 거부)
- **STT 완료 감지** — MinutesMode에서 Socket.io `transcribe:complete` 이벤트로 대기 (polling 방식 제거)
- **io 순환참조** — `server.ts`에서 `setIo()`, 다른 파일에서 `getIo()` 사용

## Database

```bash
# 마이그레이션 (backend/ 에서)
../node_modules/.bin/prisma migrate dev --name <name>

# DB 확인
../node_modules/.bin/prisma studio
```

PostgreSQL은 Homebrew 설치, 비밀번호 없음 (`david@localhost:5432`).
