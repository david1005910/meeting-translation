import OpenAI, { toFile } from 'openai';
import fs from 'fs';
import path from 'path';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MIME_MAP: Record<string, string> = {
  '.webm': 'audio/webm',
  '.mp3':  'audio/mpeg',
  '.mp4':  'audio/mp4',
  '.m4a':  'audio/mp4',
  '.wav':  'audio/wav',
  '.ogg':  'audio/ogg',
  '.oga':  'audio/ogg',
  '.flac': 'audio/flac',
};

export interface TranscriptSegment {
  id: number;
  start: number;
  end: number;
  text: string;
}

export interface TranscriptResult {
  segments: TranscriptSegment[];
  rawText: string;
  language: string;
  avgNoSpeechProb: number;  // 0~1, 높을수록 무음
}

export class WhisperService {
  async transcribe(audioPath: string, language: string): Promise<TranscriptResult> {
    const stats = fs.statSync(audioPath);
    const fileSizeMB = stats.size / (1024 * 1024);

    if (fileSizeMB > 24) {
      console.warn(`대용량 파일 (${fileSizeMB.toFixed(1)}MB). 처리 시간이 길어질 수 있습니다.`);
    }

    return this.transcribeFile(audioPath, language);
  }

  private async transcribeFile(audioPath: string, language: string): Promise<TranscriptResult> {
    const ext = path.extname(audioPath).toLowerCase();
    const mimeType = MIME_MAP[ext] || 'audio/webm';
    const fileName = path.basename(audioPath);

    // toFile()로 MIME 타입을 명시적으로 지정해야 Whisper가 형식을 인식함
    const file = await toFile(fs.createReadStream(audioPath), fileName, { type: mimeType });

    const response = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language,
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
    });

    const rawSegments = response.segments || [];

    // no_speech_prob 평균 계산 (무음 확률)
    const avgNoSpeechProb = rawSegments.length > 0
      ? rawSegments.reduce((sum, seg) => sum + (seg.no_speech_prob ?? 0), 0) / rawSegments.length
      : 0;

    const segments: TranscriptSegment[] = rawSegments.map((seg, idx) => ({
      id: idx,
      start: seg.start,
      end: seg.end,
      text: seg.text.trim(),
    }));

    return {
      segments,
      rawText: response.text,
      language: response.language || language,
      avgNoSpeechProb,
    };
  }
}

export const whisperService = new WhisperService();
