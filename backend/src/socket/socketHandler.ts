import { Server, Socket } from 'socket.io';
import { verifyToken } from '../utils/jwt';
import { claudeService } from '../services/claude.service';
import { whisperService } from '../services/whisper.service';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Whisper가 무음/배경음에서 생성하는 알려진 환각 문구
const WHISPER_HALLUCINATIONS = [
  '시청해주셔서 감사합니다',
  '구독과 좋아요 부탁드립니다',
  '구독해주세요',
  '좋아요와 구독',
  'thank you for watching',
  'thanks for watching',
  'please subscribe',
  'like and subscribe',
  'MBC 뉴스',
];

function isHallucination(text: string): boolean {
  const lower = text.trim().toLowerCase();
  if (lower.length < 2) return true;
  return WHISPER_HALLUCINATIONS.some((h) => lower.includes(h.toLowerCase()));
}

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
        if (isHallucination(transcript.rawText)) return;

        if (data.language === 'ko') {
          // Korean → selected target language only
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
          // Foreign → Korean (original behavior)
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
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] 해제: ${socket.id}`);
    });
  });
}
