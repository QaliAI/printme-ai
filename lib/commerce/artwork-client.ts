'use client';

export async function persistBrowserArtwork(blob: Blob, designId: string, revision = 1) {
  const form = new FormData();
  form.append('file', blob, 'artwork.png');
  form.append('designId', designId);
  form.append('revision', String(revision));
  const response = await fetch('/api/commerce/artwork/persist', { method: 'POST', body: form, signal: AbortSignal.timeout(30_000) });
  const result = await response.json().catch(() => ({})) as { productionAssetUrl?: string; checksum?: string };
  if (!response.ok || !result.productionAssetUrl?.startsWith('https://')) {
    throw new Error('Your artwork could not be saved. Please try again before adding it to your bag.');
  }
  return result.productionAssetUrl;
}

export async function rasterizePersonalizedSvg(svgUrl: string, width: number, height: number) {
  const image = new Image();
  image.src = svgUrl;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Your browser cannot prepare this artwork.');
  context.drawImage(image, 0, 0, width, height);
  return new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Your artwork could not be prepared.')), 'image/png'));
}
