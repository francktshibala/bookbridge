import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';

export class AudioGenerator {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generateAudio(
    text: string, 
    voiceId: string = 'alloy',
    bookId: string,
    chunkIndex: number,
    cefrLevel: string
  ): Promise<string> {
    try {
      const ttsResponse = await this.openai.audio.speech.create({
        model: 'tts-1',
        voice: voiceId as any,
        input: text,
        response_format: 'mp3'
      });

      const audioDir = path.join(process.cwd(), 'public', 'audio', bookId, cefrLevel);
      await fs.mkdir(audioDir, { recursive: true });

      const fileName = `chunk_${chunkIndex}.mp3`;
      const filePath = path.join(audioDir, fileName);
      
      const buffer = Buffer.from(await ttsResponse.arrayBuffer());
      await fs.writeFile(filePath, buffer);

      return `/audio/${bookId}/${cefrLevel}/${fileName}`;
    } catch (error) {
      console.error('Audio generation failed:', error);
      throw error;
    }
  }
}