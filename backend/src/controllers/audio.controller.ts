import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { meetingService } from '../services/meeting.service';
import { whisperService } from '../services/whisper.service';
import { claudeService } from '../services/claude.service';
import { exportService } from '../services/export.service';
import prisma from '../utils/prisma';
import { getIo } from '../utils/socket';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const audioController = {
  async upload(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ error: '파일을 업로드해주세요.' });
        return;
      }
      const { meetingId } = req.params;
      await meetingService.updateMeeting(meetingId, req.userId!, {
        audioPath: req.file.path,
        status: 'in_progress',
      });
      res.json({ message: '파일 업로드 완료', path: req.file.path });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async transcribe(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { meetingId } = req.params;
      const meeting = await meetingService.getMeetingById(meetingId, req.userId!);

      if (!meeting.audioPath) {
        res.status(400).json({ error: '오디오 파일이 없습니다. 먼저 파일을 업로드하세요.' });
        return;
      }

      res.json({ message: 'STT 처리를 시작합니다.' });

      // 비동기 처리
      (async () => {
        try {
          getIo().to(meetingId).emit('transcribe:progress', { progress: 10 });

          const transcript = await whisperService.transcribe(meeting.audioPath!, meeting.language);

          getIo().to(meetingId).emit('transcribe:progress', { progress: 80 });

          await prisma.transcript.upsert({
            where: { meetingId },
            create: {
              meetingId,
              segments: transcript.segments as any,
              rawText: transcript.rawText,
            },
            update: {
              segments: transcript.segments as any,
              rawText: transcript.rawText,
            },
          });

          await meetingService.updateMeeting(meetingId, req.userId!, { status: 'completed' });

          getIo().to(meetingId).emit('transcribe:complete', { transcript });
        } catch (err: any) {
          console.error('[Transcribe Error]', err);
          getIo().to(meetingId).emit('transcribe:error', { error: err.message });
        }
      })();
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async generateMinutes(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { meetingId } = req.params;
      const meeting = await meetingService.getMeetingById(meetingId, req.userId!);

      if (!meeting.transcript) {
        res.status(400).json({ error: '트랜스크립트가 없습니다. 먼저 STT를 실행하세요.' });
        return;
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders(); // send headers immediately so client doesn't time out waiting

      let fullContent = '';

      const generator = claudeService.generateMinutes(
        {
          segments: meeting.transcript.segments as any,
          rawText: meeting.transcript.rawText,
        },
        {
          title: meeting.title,
          company: meeting.company,
          language: meeting.language,
          participants: meeting.participants,
          createdAt: meeting.createdAt,
        }
      );

      for await (const chunk of generator) {
        fullContent += chunk;
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      }

      // 완료 후 DB 저장
      await prisma.minutes.upsert({
        where: { meetingId },
        create: { meetingId, content: fullContent },
        update: { content: fullContent },
      });

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async getMinutes(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { meetingId } = req.params;
      const minutes = await prisma.minutes.findUnique({ where: { meetingId } });
      if (!minutes) {
        res.status(404).json({ error: '회의록이 없습니다.' });
        return;
      }
      res.json(minutes);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async updateMinutes(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { meetingId } = req.params;
      const { content } = req.body;
      const minutes = await prisma.minutes.update({
        where: { meetingId },
        data: { content, editedAt: new Date() },
      });
      res.json(minutes);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  },

  async downloadMinutes(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { meetingId } = req.params;
      const { format } = req.query as { format: string };
      const minutes = await prisma.minutes.findUnique({ where: { meetingId } });
      if (!minutes) {
        res.status(404).json({ error: '회의록이 없습니다.' });
        return;
      }

      if (format === 'docx') {
        const buffer = await exportService.toDocx(minutes.content);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="minutes-${meetingId}.docx"`);
        res.send(buffer);
      } else {
        const buffer = exportService.toMarkdown(minutes.content);
        res.setHeader('Content-Type', 'text/markdown');
        res.setHeader('Content-Disposition', `attachment; filename="minutes-${meetingId}.md"`);
        res.send(buffer);
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async tts(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { text, language } = req.body as { text: string; language: string };
      if (!text?.trim()) {
        res.status(400).json({ error: '텍스트를 입력해주세요.' });
        return;
      }
      // OpenAI TTS는 입력 텍스트 언어를 자동 감지하므로 voice만 지정
      const mp3 = await openai.audio.speech.create({
        model: 'tts-1',
        voice: language === 'zh' ? 'shimmer' : language === 'vi' ? 'nova' : 'alloy',
        input: text,
        response_format: 'mp3',
      });
      const buffer = Buffer.from(await mp3.arrayBuffer());
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', buffer.length);
      res.send(buffer);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async saveInterpretLogs(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { meetingId } = req.params;
      const { logs } = req.body as {
        logs: Array<{ timestamp: number; original: string; translated: string; targetLanguage?: string }>;
      };

      await prisma.interpretLog.createMany({
        data: logs.map((log) => ({ meetingId, ...log })),
      });

      res.json({ message: '통역 기록이 저장되었습니다.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};
