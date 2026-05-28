export interface ImageProvider {
  generateDesign(imageUrl: string, styleDescription: string): Promise<string>;
}

export function getImageProvider(): ImageProvider {
  const provider = process.env.AI_PROVIDER || 'mock';

  if (provider === 'openai') {
    return require('./openai-image-provider').openaiImageProvider;
  }

  return require('./mock-image-provider').mockImageProvider;
}
