import OpenAI from 'openai';
import { buildMinutesPrompt, MeetingMeta, TranscriptData } from '../utils/prompts';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = 'gpt-4o-mini';

const langMap: Record<string, string> = {
  en: '영어',
  zh: '중국어',
  vi: '베트남어',
};

export class ClaudeService {
  async *generateMinutes(transcript: TranscriptData, meeting: MeetingMeta): AsyncGenerator<string> {
    const prompt = buildMinutesPrompt(transcript, meeting);
    const system = `당신은 전문 비서입니다. 회의 트랜스크립트를 바탕으로 한국어로 구조화된 비즈니스 회의록을 작성합니다. 반드시 마크다운 형식으로 작성하고, 모든 내용은 한국어로 작성하세요.`;

    const stream = await openai.chat.completions.create({
      model: MODEL,
      stream: true,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) yield content;
    }
  }

  async translate(text: string, sourceLanguage: string): Promise<string> {
    const langName = langMap[sourceLanguage] || sourceLanguage;
    const system = `당신은 전문 통역사입니다. ${langName} 텍스트를 자연스러운 한국어 비즈니스 표현으로 번역합니다. 번역문만 출력하세요. 설명이나 주석은 포함하지 마세요.`;

    const res = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: text },
      ],
    });

    return res.choices[0].message.content ?? '';
  }
}

export const claudeService = new ClaudeService();
