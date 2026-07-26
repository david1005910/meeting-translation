import { buildMinutesPrompt, MeetingMeta, TranscriptData } from '../utils/prompts';
import fs from 'fs';
import path from 'path';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
// VLM 모델 옵션: llava:7b, llava:13b, bakllava, llava-phi3 등
const VLM_MODEL = process.env.VLM_MODEL || 'llava:7b';

const langMap: Record<string, string> = {
  en: '영어',
  zh: '중국어',
  vi: '베트남어',
};

export class VLMService {
  /**
   * 이미지와 텍스트를 함께 처리할 수 있는 VLM API 호출
   */
  private async callVLM(prompt: string, imagePath?: string): Promise<Response> {
    const requestBody: any = {
      model: VLM_MODEL,
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.7,
        top_p: 0.95,
      }
    };

    // 이미지가 있는 경우 base64로 인코딩하여 추가
    if (imagePath && fs.existsSync(imagePath)) {
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');
      requestBody.images = [base64Image];
    }
    
    return fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
  }

  /**
   * 스트리밍 VLM API 호출
   */
  private async callVLMStream(prompt: string, imagePath?: string): Promise<Response> {
    const requestBody: any = {
      model: VLM_MODEL,
      prompt: prompt,
      stream: true,
      options: {
        temperature: 0.7,
        top_p: 0.95,
      }
    };

    if (imagePath && fs.existsSync(imagePath)) {
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');
      requestBody.images = [base64Image];
    }
    
    return fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
  }

  /**
   * 회의 사진과 함께 회의록 생성
   * 화이트보드, 프레젠테이션 슬라이드 등의 이미지를 분석하여 회의록에 포함
   */
  async *generateMinutesWithImages(
    transcript: TranscriptData, 
    meeting: MeetingMeta, 
    imagePaths?: string[]
  ): AsyncGenerator<string> {
    const prompt = buildMinutesPrompt(transcript, meeting);
    
    let fullPrompt = `당신은 전문 비서입니다. 회의 트랜스크립트와 회의 중 촬영된 이미지(화이트보드, 슬라이드 등)를 바탕으로 한국어로 구조화된 비즈니스 회의록을 작성합니다.
    
이미지가 제공된 경우:
- 화이트보드의 다이어그램이나 도표를 텍스트로 설명
- 프레젠테이션 슬라이드의 핵심 내용 요약
- 중요한 시각 자료의 내용을 회의록에 통합

반드시 마크다운 형식으로 작성하고, 모든 내용은 한국어로 작성하세요.

${prompt}`;

    try {
      // 첫 번째 이미지와 함께 처리 (VLM은 보통 한 번에 하나의 이미지만 처리)
      const imagePath = imagePaths && imagePaths[0] ? imagePaths[0] : undefined;
      const response = await this.callVLMStream(fullPrompt, imagePath);
      
      if (!response.ok) {
        throw new Error(`VLM API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.trim()) {
            try {
              const json = JSON.parse(line);
              if (json.response) {
                yield json.response;
              }
            } catch (e) {
              console.error('Error parsing VLM response:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('VLM generation error:', error);
      yield '회의록 생성 중 오류가 발생했습니다.';
    }
  }

  /**
   * 이미지와 텍스트를 함께 번역
   * 예: 외국어 프레젠테이션 슬라이드 이미지를 분석하여 한국어로 번역
   */
  async translateWithImage(text: string, sourceLanguage: string, imagePath?: string): Promise<string> {
    const langName = langMap[sourceLanguage] || sourceLanguage;
    
    let prompt = `당신은 전문 통역사입니다. ${langName} 텍스트를 자연스러운 한국어 비즈니스 표현으로 번역합니다.`;
    
    if (imagePath) {
      prompt += `
      
이미지가 제공된 경우:
- 이미지 내의 텍스트도 함께 번역
- 다이어그램이나 차트의 라벨과 설명을 한국어로 번역
- 시각적 맥락을 고려하여 더 정확한 번역 제공`;
    }
    
    prompt += `

번역할 텍스트: ${text}

번역문만 출력하세요. 설명이나 주석은 포함하지 마세요.`;

    try {
      const response = await this.callVLM(prompt, imagePath);
      
      if (!response.ok) {
        throw new Error(`VLM API error: ${response.status}`);
      }

      const data = await response.json() as { response?: string };
      return data.response || '';
    } catch (error) {
      console.error('VLM translation error:', error);
      return `[번역 오류] ${text}`;
    }
  }

  /**
   * 회의 장면 이미지 분석
   * 참석자, 분위기, 화이트보드 내용 등을 분석
   */
  async analyzeMeetingScene(imagePath: string): Promise<string> {
    const prompt = `이 회의 장면 이미지를 분석하여 다음 내용을 한국어로 설명해주세요:

1. 참석자 수와 회의 형태 (대면/화상)
2. 화이트보드나 프레젠테이션 화면의 내용
3. 회의 분위기 (공식적/비공식적)
4. 눈에 띄는 다이어그램, 차트, 또는 중요 정보
5. 기타 회의록에 포함될 만한 시각적 정보

간단명료하게 요약하여 설명하세요.`;

    try {
      const response = await this.callVLM(prompt, imagePath);
      
      if (!response.ok) {
        throw new Error(`VLM API error: ${response.status}`);
      }

      const data = await response.json() as { response?: string };
      return data.response || '이미지 분석 실패';
    } catch (error) {
      console.error('VLM scene analysis error:', error);
      return '[이미지 분석 오류]';
    }
  }

  /**
   * 문서 이미지 OCR 및 번역
   * 스캔된 문서나 사진으로 찍은 문서를 텍스트로 변환하고 번역
   */
  async ocrAndTranslate(imagePath: string, targetLanguage: string = 'ko'): Promise<{
    originalText: string;
    translatedText: string;
  }> {
    const prompt = `Please perform OCR on this image and extract all text content.
Then translate the extracted text to ${targetLanguage === 'ko' ? 'Korean' : targetLanguage}.

Provide the response in the following JSON format:
{
  "original": "extracted text here",
  "translated": "translated text here"
}

Focus on accuracy and maintain the document structure.`;

    try {
      const response = await this.callVLM(prompt, imagePath);
      
      if (!response.ok) {
        throw new Error(`VLM API error: ${response.status}`);
      }

      const data = await response.json() as { response?: string };
      
      // JSON 파싱 시도
      try {
        const result = JSON.parse(data.response || '{}');
        return {
          originalText: result.original || '',
          translatedText: result.translated || ''
        };
      } catch {
        // JSON 파싱 실패 시 원본 텍스트 반환
        return {
          originalText: data.response || '',
          translatedText: ''
        };
      }
    } catch (error) {
      console.error('VLM OCR error:', error);
      return {
        originalText: '[OCR 오류]',
        translatedText: '[번역 오류]'
      };
    }
  }
}

export const vlmService = new VLMService();