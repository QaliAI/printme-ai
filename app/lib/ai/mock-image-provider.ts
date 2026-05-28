import { ImageProvider } from './image-provider';

class MockImageProvider implements ImageProvider {
  async generateDesign(imageUrl: string, styleDescription: string): Promise<string> {
    // Simulate API latency
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Return a placeholder image with gradient based on style
    // Using a 1200x1200px placeholder
    const placeholderUrl = new URL('https://via.placeholder.com/1200x1200');
    placeholderUrl.searchParams.set('text', 'AI Generated Design\n' + styleDescription);
    placeholderUrl.searchParams.set('bg', '4F46E5');
    placeholderUrl.searchParams.set('textcolor', 'FFFFFF');

    return placeholderUrl.toString();
  }
}

export const mockImageProvider = new MockImageProvider();
