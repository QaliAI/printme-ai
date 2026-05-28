import { ImageProvider, ImageProviderOptions, ImageProviderResult } from './image-provider';

export class MockImageProvider implements ImageProvider {
  getName(): string {
    return 'mock';
  }

  async validateConnection(): Promise<boolean> {
    // Mock always succeeds
    return true;
  }

  async generateDesign(options: ImageProviderOptions): Promise<ImageProviderResult> {
    // Simulate network latency
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Build a more detailed prompt for the user to see what was requested
    const fullPrompt = `
${options.promptTemplate}

Image Context: ${options.imageContext || 'User uploaded image'}
Negative Prompt: ${options.negativePrompt || 'None'}

MOCK MODE: No actual AI processing. Use this URL for demo:
    `.trim();

    // Return a placeholder image URL
    // In production, use Cloudinary transformations or actual generated images
    const mockImageUrl = 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80';

    return {
      imageUrl: mockImageUrl,
      requestId: `mock-${Date.now()}`,
      prompt: fullPrompt,
    };
  }
}
