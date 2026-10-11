import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageProviderError, type ImageProvider, type ImageProviderOptions } from './image-provider';

// Explicit local demo fixture. Production never selects this provider.
export class MockImageProvider implements ImageProvider {
  getName() { return 'mock'; }
  async validateConnection() { return process.env.NODE_ENV !== 'production'; }
  async generateDesign(options: ImageProviderOptions) {
    if (process.env.NODE_ENV === 'production') throw new ImageProviderError('Image generation is temporarily unavailable.', 'PROVIDER_UNAVAILABLE', 503);
    const bytes = await readFile(join(process.cwd(), 'public/designs/seasonal-edit/haunted-household.png'));
    return { imageUrl: 'data:image/png;base64,' + bytes.toString('base64'), model: 'local-demo-fixture',
      prompt: 'Local demo fixture: ' + options.promptTemplate, width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }
}
