// Abstract interface for image generation/editing

export interface ImageProviderOptions {
  imageUrl: string;
  promptTemplate: string;
  negativePrompt?: string;
  imageContext?: string;
}

export interface ImageProviderResult {
  imageUrl: string;
  requestId?: string;
  prompt: string;
}

export interface ImageProvider {
  generateDesign(options: ImageProviderOptions): Promise<ImageProviderResult>;
  validateConnection(): Promise<boolean>;
  getName(): string;
}

export async function getImageProvider(): Promise<ImageProvider> {
  const provider = process.env.AI_PROVIDER || 'mock';

  if (provider === 'openai') {
    const { OpenAIImageProvider } = await import('./openai-image-provider');
    return new OpenAIImageProvider();
  }

  // Default to mock
  const { MockImageProvider } = await import('./mock-image-provider');
  return new MockImageProvider();
}
