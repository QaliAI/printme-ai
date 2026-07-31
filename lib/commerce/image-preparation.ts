export type PreparationMode = 'original' | 'background-removed' | 'art';
export type ArtStyle = 'illustrated' | 'poster' | 'soft-paint';

export interface PreparedImage {
  blob: Blob;
  width: number;
  height: number;
  mimeType: string;
  hasTransparency: boolean;
}

async function canvasBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality?: number,
) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error('Image preparation failed.')),
      mimeType,
      quality,
    );
  });
}

async function drawSource(blob: Blob) {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('This browser cannot prepare images.');
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  return { canvas, context };
}

function backgroundDistance(
  red: number,
  green: number,
  blue: number,
  sample: [number, number, number],
) {
  return Math.sqrt(
    (red - sample[0]) ** 2 +
      (green - sample[1]) ** 2 +
      (blue - sample[2]) ** 2,
  );
}

function cornerSample(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): [number, number, number] {
  const points = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
  ];
  const total = points.reduce(
    (sum, [x, y]) => {
      const index = (y * width + x) * 4;
      sum[0] += pixels[index];
      sum[1] += pixels[index + 1];
      sum[2] += pixels[index + 2];
      return sum;
    },
    [0, 0, 0],
  );
  return total.map((value) => Math.round(value / points.length)) as [
    number,
    number,
    number,
  ];
}

export async function inspectImage(blob: Blob): Promise<PreparedImage> {
  const bitmap = await createImageBitmap(blob);
  const result = {
    blob,
    width: bitmap.width,
    height: bitmap.height,
    mimeType: blob.type || 'image/png',
    hasTransparency: blob.type === 'image/png' || blob.type === 'image/webp',
  };
  bitmap.close();
  return result;
}

export async function prepareImage(
  source: Blob,
  mode: PreparationMode,
  artStyle: ArtStyle,
): Promise<PreparedImage> {
  if (mode === 'original') return inspectImage(source);

  const { canvas, context } = await drawSource(source);
  const image = context.getImageData(0, 0, canvas.width, canvas.height);

  if (mode === 'background-removed') {
    const sample = cornerSample(image.data, canvas.width, canvas.height);
    for (let index = 0; index < image.data.length; index += 4) {
      const distance = backgroundDistance(
        image.data[index],
        image.data[index + 1],
        image.data[index + 2],
        sample,
      );
      if (distance < 36) image.data[index + 3] = 0;
      else if (distance < 72) {
        image.data[index + 3] = Math.round(
          image.data[index + 3] * ((distance - 36) / 36),
        );
      }
    }
    context.putImageData(image, 0, 0);
    return {
      blob: await canvasBlob(canvas, 'image/png'),
      width: canvas.width,
      height: canvas.height,
      mimeType: 'image/png',
      hasTransparency: true,
    };
  }

  const levels =
    artStyle === 'poster' ? 5 : artStyle === 'illustrated' ? 7 : 12;
  const contrast = artStyle === 'soft-paint' ? 0.92 : 1.08;
  for (let index = 0; index < image.data.length; index += 4) {
    for (let channel = 0; channel < 3; channel += 1) {
      const centered = (image.data[index + channel] - 128) * contrast + 128;
      image.data[index + channel] = Math.round(
        Math.round((Math.max(0, Math.min(255, centered)) / 255) * levels) *
          (255 / levels),
      );
    }
  }
  context.putImageData(image, 0, 0);
  return {
    blob: await canvasBlob(canvas, 'image/webp', 0.94),
    width: canvas.width,
    height: canvas.height,
    mimeType: 'image/webp',
    hasTransparency: source.type === 'image/png',
  };
}
