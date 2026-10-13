import 'server-only';
import { getImageProvider, ImageProviderError, type ImageProvider, type ImageProviderOptions } from './image-provider';
import { persistArtwork } from '@/lib/commerce/artwork-storage';

export async function generateDurableArtwork(
  options: ImageProviderOptions,
  identity: { designId: string; revision: number },
  dependencies: { provider?: ImageProvider; persist?: typeof persistArtwork } = {},
) {
  const provider = dependencies.provider ?? await getImageProvider();
  const result = await provider.generateDesign(options);
  if (!result.imageUrl.startsWith('data:image/png;base64,')) {
    throw new ImageProviderError('The image provider did not return printable artwork.', 'INVALID_OUTPUT');
  }
  const bytes = Buffer.from(result.imageUrl.split(',')[1], 'base64');
  const stored = await (dependencies.persist ?? persistArtwork)({ ...identity, bytes, mimeType: 'image/png' });
  return { ...stored, model: result.model, requestId: result.requestId, width: result.width ?? 1024, height: result.height ?? 1536 };
}
