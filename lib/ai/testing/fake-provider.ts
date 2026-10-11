import 'server-only';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ImageProvider, ImageProviderOptions } from '../image-provider';
import { validateImageInput } from '../openai-image-provider';

// Called only behind the existing development-only, secret-protected E2E gate.
export class FakeImageProvider implements ImageProvider {
  getName() { return 'e2e-fake'; }
  async validateConnection() { return true; }
  async generateDesign(options: ImageProviderOptions) {
    if (!options.imageUrl) throw new Error('Fake photo edit requires its source image.');
    validateImageInput(options.imageUrl);
    const bytes = await readFile(join(process.cwd(), 'public/designs/seasonal-edit/haunted-household.png'));
    return { imageUrl: `data:image/png;base64,${bytes.toString('base64')}`, prompt: options.promptTemplate,
      model: 'e2e-fake', width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }
}
