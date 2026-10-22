// Abstract interface for image generation/editing

export interface ImageProviderOptions {
  imageUrl?: string;
  /** Ordered reference photos for a single edit. Existing one-photo callers are unchanged. */
  imageUrls?: string[];
  workflow?: 'photo-edit' | 'text-generation';
  background?: 'transparent' | 'opaque';
  promptTemplate: string;
  negativePrompt?: string;
  imageContext?: string;
}

export interface ImageProviderResult {
  imageUrl: string;
  requestId?: string;
  prompt: string;
  model?: string;
  width?: number;
  height?: number;
}

export interface ImageProvider {
  generateDesign(options: ImageProviderOptions): Promise<ImageProviderResult>;
  validateConnection(): Promise<boolean>;
  getName(): string;
}

export async function getImageProvider(): Promise<ImageProvider> {
  const provider = process.env.AI_PROVIDER || 'openai';

  if (provider === 'openai') {
    const { OpenAIImageProvider } = await import('./openai-image-provider');
    return new OpenAIImageProvider();
  }

  if (provider === 'mock' && process.env.NODE_ENV !== 'production') {
    const { MockImageProvider } = await import('./mock-image-provider');
    return new MockImageProvider();
  }
  throw new ImageProviderError('Image generation is temporarily unavailable.', 'PROVIDER_UNAVAILABLE', 503);
}

export class ImageProviderError extends Error {
  constructor(message: string, readonly code: string, readonly status = 502) {
    super(message);
    this.name = 'ImageProviderError';
  }
}
