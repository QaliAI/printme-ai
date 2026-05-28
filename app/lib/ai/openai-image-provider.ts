import { ImageProvider } from './image-provider';

class OpenAIImageProvider implements ImageProvider {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
  }

  async generateDesign(imageUrl: string, styleDescription: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    try {
      const prompt = `Generate a high-quality design suitable for print-on-demand products in the following style: ${styleDescription}. The design should be visually appealing, artistic, and ready for printing on merchandise. Size: 1024x1024.`;

      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt,
          n: 1,
          size: '1024x1024',
          quality: 'standard',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`DALL-E API error: ${error.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const generatedImageUrl = data.data?.[0]?.url;

      if (!generatedImageUrl) {
        throw new Error('No image URL returned from DALL-E API');
      }

      return generatedImageUrl;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to generate design: ${error.message}`);
      }
      throw error;
    }
  }
}

export const openaiImageProvider = new OpenAIImageProvider();
