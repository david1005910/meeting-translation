import { buildMinutesPrompt, MeetingMeta, TranscriptData } from '../utils/prompts';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma3:12b';

const langMap: Record<string, string> = {
  en: '영어',
  zh: '중국어',
  vi: '베트남어',
};

async function ollamaChat(
  system: string,
  userMessage: string,
  stream: false
): Promise<string>;
async function ollamaChat(
  system: string,
  userMessage: string,
  stream: true
): Promise<AsyncGenerator<string>>;
async function ollamaChat(
  system: string,
  userMessage: string,
  stream: boolean
): Promise<string | AsyncGenerator<string>> {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      stream,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userMessage },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ollama 오류 (${res.status}): ${text}`);
  }

  if (!stream) {
    const json = await res.json() as { message: { content: string } };
    return json.message.content;
  }

  // stream=true: return async generator
  async function* gen(): AsyncGenerator<string> {
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buf = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const json = JSON.parse(line) as { message?: { content?: string }; done?: boolean };
          if (json.message?.content) yield json.message.content;
        } catch { /* skip malformed */ }
      }
    }
  }

  return gen();
}

export class ClaudeService {
  async *generateMinutes(transcript: TranscriptData, meeting: MeetingMeta): AsyncGenerator<string> {
    const prompt = buildMinutesPrompt(transcript, meeting);
    const system = `당신은 전문 비서입니다. 회의 트랜스크립트를 바탕으로 한국어로 구조화된 비즈니스 회의록을 작성합니다. 반드시 마크다운 형식으로 작성하고, 모든 내용은 한국어로 작성하세요.`;

    const gen = await ollamaChat(system, prompt, true);
    yield* gen;
  }

  async translate(text: string, sourceLanguage: string): Promise<string> {
    const langName = langMap[sourceLanguage] || sourceLanguage;
    const system = `당신은 전문 통역사입니다. ${langName} 텍스트를 자연스러운 한국어 비즈니스 표현으로 번역합니다. 번역문만 출력하세요. 설명이나 주석은 포함하지 마세요.`;

    return ollamaChat(system, text, false);
  }
}

export const claudeService = new ClaudeService();
