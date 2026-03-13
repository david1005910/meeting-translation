import { Server, Socket } from 'socket.io';
import { verifyToken } from '../utils/jwt';
import { claudeService } from '../services/claude.service';
import { whisperService } from '../services/whisper.service';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// ──────────────────────────────────────────
// Whisper 환각(hallucination) 필터
// ──────────────────────────────────────────

// 1) 부분 문자열 포함 시 환각으로 판정 (normalize 후 공백 제거 비교)
const HALLUCINATION_SUBSTRINGS = [
  // 시청/감사 계열
  '시청해주셔서감사합니다',
  '시청해주셔서감사',
  '봐주셔서감사합니다',
  '봐주셔서감사',
  // 구독 계열
  '구독과좋아요',
  '구독해주세요',
  '좋아요와구독',
  '좋아요구독',
  '알림설정',
  // YouTube 마무리 계열
  '다음영상에서만나요',
  '다음영상에서뵙겠습니다',
  '여기까지입니다',
  '영상은여기까지',
  '이번영상은여기서',
  '다음번에또만나요',
  '다음에또만나요',
  '다음시간에만나요',
  // 영어
  'thank you for watching',
  'thanks for watching',
  'see you in the next video',
  'see you next time',
  'until next time',
  'please subscribe',
  'like and subscribe',
  'don\'t forget to subscribe',
];

// 2) 두 키워드가 동시에 등장하면 환각으로 판정
const HALLUCINATION_PAIRS: [string, string][] = [
  ['시청', '감사합니다'],
  ['시청', '감사해요'],
  ['영상', '감사합니다'],
  ['영상', '봐주'],
  ['영상', '여기까지'],
  ['다음', '영상'],
  ['다음', '만나요'],
  ['다음', '뵙겠습니다'],
  ['여기까지', '만나요'],
  ['구독', '좋아요'],
  ['구독', '감사'],
];

function normalize(text: string): string {
  return text.replace(/\s+/g, '').toLowerCase();
}

function isHallucination(text: string): boolean {
  const raw = text.trim();
  if (raw.length < 2) return true;

  const norm = normalize(raw);
  const lower = raw.toLowerCase();

  // 부분 문자열 검사
  if (HALLUCINATION_SUBSTRINGS.some((h) => norm.includes(normalize(h)))) return true;

  // 키워드 쌍 검사
  if (HALLUCINATION_PAIRS.some(([a, b]) => lower.includes(a) && lower.includes(b))) return true;

  return false;
}

// ──────────────────────────────────────────
// 소켓별 최근 전사 캐시 (중복 방지)
// ──────────────────────────────────────────
const RECENT_CACHE_SIZE = 3;
const recentTranscripts = new Map<string, string[]>(); // socketId → last N texts

function isDuplicate(socketId: string, text: string): boolean {
  const norm = normalize(text);
  const history = recentTranscripts.get(socketId) || [];
  if (history.some((h) => normalize(h) === norm)) return true;

  // 캐시 갱신
  history.push(text);
  if (history.length > RECENT_CACHE_SIZE) history.shift();
  recentTranscripts.set(socketId, history);
  return false;
}

// ──────────────────────────────────────────

export function setupSocketHandlers(io: Server): void {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    const user = verifyToken(token);
    if (!user) return next(new Error('인증 실패'));
    (socket as any).userId = user.id;
    next();
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] 연결: ${socket.id}`);

    socket.on('join-session', (meetingId: string) => {
      socket.join(meetingId);
      console.log(`[Socket] ${socket.id} → 세션 ${meetingId} 참여`);
    });

    socket.on('audio-chunk', async (data: {
      meetingId: string;
      language: string;
      audioBase64: string;
      timestamp: number;
      targetLanguage?: string;
    }) => {
      try {
        const tmpDir = '/tmp';
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

        const tmpPath = path.join(tmpDir, `chunk-${uuidv4()}.webm`);
        const audioBuffer = Buffer.from(data.audioBase64, 'base64');
        fs.writeFileSync(tmpPath, audioBuffer);

        const transcript = await whisperService.transcribe(tmpPath, data.language);
        fs.unlinkSync(tmpPath);

        if (!transcript.rawText.trim()) return;
        if (isHallucination(transcript.rawText)) {
          console.log(`[Socket] 환각 필터: "${transcript.rawText.trim()}"`);
          return;
        }
        if (isDuplicate(socket.id, transcript.rawText)) {
          console.log(`[Socket] 중복 필터: "${transcript.rawText.trim()}"`);
          return;
        }

        if (data.language === 'ko') {
          const lang = data.targetLanguage || 'zh';
          const translated = await claudeService.translateFromKorean(transcript.rawText, lang);
          socket.emit('translation-result', {
            timestamp: data.timestamp,
            original: transcript.rawText,
            translated,
            targetLanguage: lang,
            meetingId: data.meetingId,
          });
        } else {
          const translated = await claudeService.translate(transcript.rawText, data.language);
          socket.emit('translation-result', {
            timestamp: data.timestamp,
            original: transcript.rawText,
            translated,
            meetingId: data.meetingId,
          });
        }
      } catch (error: any) {
        console.error('[Socket] 처리 오류:', error);
        socket.emit('translation-error', { message: '번역 처리 중 오류가 발생했습니다.' });
      }
    });

    socket.on('leave-session', (meetingId: string) => {
      socket.leave(meetingId);
      recentTranscripts.delete(socket.id);
    });

    socket.on('disconnect', () => {
      recentTranscripts.delete(socket.id);
      console.log(`[Socket] 해제: ${socket.id}`);
    });
  });
}
