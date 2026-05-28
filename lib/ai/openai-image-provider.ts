import { ImageProvider, ImageProviderOptions, ImageProviderResult } from './image-provider';

export class OpenAIImageProvider implements ImageProvider {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
  }

  getName(): string {
    return 'openai';
  }

  async validateConnection(): Promise<boolean> {
    if (!this.apiKey) {
      console.error('OPENAI_API_KEY not configured');
      return false;
    }
    return true;
  }

  async generateDesign(options: ImageProviderOptions): Promise<ImageProviderResult> {
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Build comprehensive prompt
    const fullPrompt = this.buildPrompt(options);

    try {
      // Call OpenAI Images API (DALL-E)
      // TODO: Implement actual OpenAI API call
      // For now, this is scaffolded

      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          prompt: fullPrompt,
          n: 1,
          size: '1024x1024',
          quality: 'hd',
          style: 'vivid',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const imageUrl = data.data[0]?.url;

      if (!imageUrl) {
        throw new Error('No image URL in response');
      }

      return {
        imageUrl,
        requestId: data.data[0]?.revised_prompt ? `openai-${Date.now()}` : undefined,
        prompt: fullPrompt,
      };
    } catch (error) {
      console.error('OpenAI image generation failed:', error);
      throw error;
    }
  }

  private buildPrompt(options: ImageProviderOptions): string {
    const parts = [
      options.promptTemplate,
      options.imageContext ? `Context: ${options.imageContext}` : null,
      'Print-safe: Ensure image is suitable for merchandise printing.',
      'Quality: High detail, professional output.',
      options.negativePrompt ? `Avoid: ${options.negativePrompt}` : null,
    ].filter(Boolean);

    return parts.join('\n\n');
  }
}
