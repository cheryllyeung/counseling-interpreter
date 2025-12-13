import OpenAI from 'openai';
import { env } from '../config/env.js';
import { createLogger } from '../utils/logger.js';
import type { TranslationDirection } from '@counseling-interpreter/shared';

const logger = createLogger('TranslationService');

// Professional psychological counseling terminology mapping
const PSYCHOLOGY_TERMS = `
Professional Terminology Reference:
- anxiety → 焦慮
- depression → 憂鬱
- trauma → 創傷
- PTSD → 創傷後壓力症候群
- attachment → 依附關係
- transference → 移情
- countertransference → 反移情
- cognitive behavioral therapy (CBT) → 認知行為治療
- mindfulness → 正念
- self-esteem → 自尊
- boundaries → 界限
- coping mechanism → 因應機制
- dissociation → 解離
- grief → 哀傷/悲傷
- panic attack → 恐慌發作
- phobia → 恐懼症
- obsessive-compulsive → 強迫症
- bipolar → 雙相情緒障礙
- schizophrenia → 思覺失調症
- eating disorder → 飲食障礙
- substance abuse → 物質濫用
- suicidal ideation → 自殺意念
- self-harm → 自傷
- therapeutic alliance → 治療同盟
- empathy → 同理心
- unconditional positive regard → 無條件正向關懷
`;

const SYSTEM_PROMPTS: Record<TranslationDirection, string> = {
  'en-to-zh': `You are a professional interpreter for psychological counseling sessions.
Translate English to Traditional Chinese (Taiwan usage).

${PSYCHOLOGY_TERMS}

Translation Guidelines:
1. Use Traditional Chinese with Taiwan terminology
2. Preserve the speaker's tone and emotional nuance
3. Use professional psychology terms from the reference above
4. Use "..." for hesitation or pauses
5. Output ONLY the translation, no explanations or notes
6. Maintain first-person perspective (我、你)
7. Keep it natural and conversational yet professional
8. Be concise - this is for spoken interpretation`,

  'zh-to-en': `You are a professional interpreter for psychological counseling sessions.
Translate Traditional Chinese to English.

${PSYCHOLOGY_TERMS}

Translation Guidelines:
1. Preserve the speaker's tone and emotional nuance
2. Use appropriate psychological terminology
3. Use "..." for hesitation or pauses
4. Output ONLY the translation, no explanations or notes
5. Maintain first-person perspective
6. Keep it natural and conversational yet professional
7. Be concise - this is for spoken interpretation`,
};

export class TranslationService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
    logger.info('Translation service initialized');
  }

  async translate(text: string, direction: TranslationDirection): Promise<string> {
    const startTime = Date.now();

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o', // Best quality translation
        messages: [
          { role: 'system', content: SYSTEM_PROMPTS[direction] },
          { role: 'user', content: text },
        ],
        temperature: 0.3,
        max_tokens: 500,
      });

      const translation = response.choices[0]?.message?.content || '';
      const latency = Date.now() - startTime;

      logger.info({ direction, latency, inputLength: text.length }, 'Translation completed');

      return translation.trim();
    } catch (error) {
      logger.error({ error, direction }, 'Translation error');
      throw error;
    }
  }

  async translateStream(
    text: string,
    direction: TranslationDirection,
    onChunk: (chunk: string) => void
  ): Promise<string> {
    const startTime = Date.now();
    let fullTranslation = '';

    try {
      const stream = await this.openai.chat.completions.create({
        model: 'gpt-4o', // Best quality translation
        messages: [
          { role: 'system', content: SYSTEM_PROMPTS[direction] },
          { role: 'user', content: text },
        ],
        temperature: 0.3,
        max_tokens: 500,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          fullTranslation += content;
          onChunk(content);
        }
      }

      const latency = Date.now() - startTime;
      logger.info({ direction, latency, inputLength: text.length }, 'Stream translation completed');

      return fullTranslation.trim();
    } catch (error) {
      logger.error({ error, direction }, 'Stream translation error');
      throw error;
    }
  }
}
