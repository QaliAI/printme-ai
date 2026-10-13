import { ImageProviderError, type ImageProvider, type ImageProviderOptions, type ImageProviderResult } from './image-provider';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MODELS = /^gpt-image-(?:2\.5-(?:sunburst|flare)(?:-2026-09-08)?|2(?:-2026-04-21)?)$/;

export function validateImageInput(image: string) {
  if (image.startsWith('data:')) {
    const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(image);
    if (!match || match[2].length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4) {
      throw new ImageProviderError('Choose a JPEG, PNG, or WebP image smaller than 10 MB.', 'INVALID_IMAGE', 400);
    }
    const bytes = Buffer.from(match[2], 'base64');
    const valid = match[1] === 'png' ? bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
      : match[1] === 'jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
      : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
    if (!valid || !bytes.length || bytes.length > MAX_IMAGE_BYTES) {
      throw new ImageProviderError('This image could not be read. Choose another photo.', 'INVALID_IMAGE', 400);
    }
    return;
  }
  let url: URL;
  try { url = new URL(image); } catch { throw new ImageProviderError('Choose a valid source image.', 'INVALID_IMAGE', 400); }
  const storageHost = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : '';
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const allowed = (url.hostname === storageHost && /^\/storage\/v1\/object\/(sign|public)\/(user-uploads|designs)\//.test(url.pathname)) ||
    (url.hostname === 'res.cloudinary.com' && Boolean(cloudName) && url.pathname.startsWith(`/${cloudName}/image/`));
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !allowed) {
    throw new ImageProviderError('Upload your photo to PrintMe before generating artwork.', 'INVALID_IMAGE', 400);
  }
}

export class OpenAIImageProvider implements ImageProvider {
  constructor(private readonly apiKey = process.env.OPENAI_API_KEY || '', private readonly transport: typeof fetch = fetch) {}
  getName() { return 'openai'; }
  async validateConnection() { return Boolean(this.apiKey); }

  async generateDesign(options: ImageProviderOptions): Promise<ImageProviderResult> {
    if (!this.apiKey) throw new ImageProviderError('Image generation is temporarily unavailable.', 'PROVIDER_UNAVAILABLE', 503);
    const workflow = options.workflow ?? 'photo-edit';
    if (workflow === 'photo-edit') {
      if (!options.imageUrl) throw new ImageProviderError('Upload a photo first.', 'IMAGE_REQUIRED', 400);
      validateImageInput(options.imageUrl);
    } else if (options.imageUrl) {
      throw new ImageProviderError('Use photo editing for an image input.', 'INVALID_WORKFLOW', 400);
    }
    if (!options.promptTemplate.trim() || options.promptTemplate.length > 4000) {
      throw new ImageProviderError('Choose a valid transformation.', 'INVALID_PROMPT', 400);
    }
    const model = workflow === 'photo-edit'
      ? process.env.OPENAI_IMAGE_EDIT_MODEL || 'gpt-image-2.5-sunburst'
      : process.env.OPENAI_IMAGE_GENERATION_MODEL || 'gpt-image-2.5-flare';
    if (!MODELS.test(model)) throw new ImageProviderError('Image generation configuration needs review.', 'INVALID_MODEL', 503);
    const prompt = [options.promptTemplate,
      workflow === 'photo-edit' ? 'Transform the supplied image. Preserve the recognizable subject, facial features, pet markings, and identity. Do not replace the subject with a generic person or animal.' : 'Create an original merchandise graphic.',
      'Produce print-ready artwork, not a photograph of a product. No protected characters, celebrities, logos, or franchise references.',
      options.imageContext, options.negativePrompt ? `Avoid: ${options.negativePrompt}` : null].filter(Boolean).join('\n\n');
    const body = { model, prompt, n: 1, size: '1024x1536', quality: 'high', output_format: 'png',
      background: options.background ?? 'transparent',
      ...(workflow === 'photo-edit' ? { images: [{ image_url: options.imageUrl }] } : {}) };
    const endpoint = workflow === 'photo-edit' ? 'edits' : 'generations';
    const started = Date.now();
    // Retry only explicit rate-limit responses. Timeouts/network errors and 5xx
    // can follow a charged generation; never blindly repeat those requests.
    for (let attempt = 0; attempt < 2; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), Math.max(1, 90_000 - (Date.now() - started)));
      try {
        const response = await this.transport(`https://api.openai.com/v1/images/${endpoint}`, {
          method: 'POST', signal: controller.signal,
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` }, body: JSON.stringify(body),
        });
        const requestId = response.headers.get('x-request-id') ?? undefined;
        const failure = !response.ok ? await response.json().catch(() => null) as { error?: { code?: string } } | null : null;
        const code = failure?.error?.code;
        const providerCode = code && ['insufficient_quota', 'billing_hard_limit_reached', 'rate_limit_exceeded', 'model_not_found', 'content_policy_violation'].includes(code) ? code : 'unknown';
        const quotaBlocked = providerCode === 'insufficient_quota' || providerCode === 'billing_hard_limit_reached';
        if (response.status === 429 && !quotaBlocked && attempt === 0) {
          const retryAfter = Number(response.headers.get('retry-after') || 1);
          if (Number.isFinite(retryAfter) && retryAfter <= 3) {
            await new Promise(resolve => setTimeout(resolve, Math.max(1, retryAfter) * 1000));
            continue;
          }
        }
        if (!response.ok) {
          console.info('image_provider', { provider: 'openai', model, workflow, status: response.status, providerCode, requestId, elapsedMs: Date.now() - started });
          if (quotaBlocked) throw new ImageProviderError('Image generation is temporarily unavailable. Please try again later.', 'PROVIDER_UNAVAILABLE', 503);
          throw new ImageProviderError(response.status === 400 ? 'This photo could not be transformed. Try another photo or style.' : 'Image generation is busy. Please try again shortly.', 'GENERATION_FAILED', response.status === 400 ? 422 : 503);
        }
        const data = await response.json() as { data?: { b64_json?: string }[] };
        const base64 = data.data?.[0]?.b64_json;
        if (!base64 || base64.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4) throw new ImageProviderError('The generated artwork could not be read. Please try again.', 'INVALID_OUTPUT');
        const imageUrl = `data:image/png;base64,${base64}`;
        try { validateImageInput(imageUrl); } catch {
          throw new ImageProviderError('The generated artwork could not be read. Please try again.', 'INVALID_OUTPUT');
        }
        const bytes = Buffer.from(base64, 'base64');
        if (bytes.length < 24 || !bytes.readUInt32BE(16) || !bytes.readUInt32BE(20)) throw new ImageProviderError('The generated artwork could not be read.', 'INVALID_OUTPUT');
        console.info('image_provider', { provider: 'openai', model, workflow, status: 'completed', requestId, elapsedMs: Date.now() - started, attempts: attempt + 1 });
        return { imageUrl, requestId, prompt, model, width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
      } catch (error) {
        if (error instanceof ImageProviderError) throw error;
        console.info('image_provider', { provider: 'openai', model, workflow, status: controller.signal.aborted ? 'timeout' : 'unavailable', elapsedMs: Date.now() - started });
        throw new ImageProviderError(controller.signal.aborted ? 'This transformation took too long. Please try again.' : 'Image generation is temporarily unavailable.', controller.signal.aborted ? 'GENERATION_TIMEOUT' : 'GENERATION_FAILED', 503);
      } finally { clearTimeout(timer); }
    }
    throw new ImageProviderError('Image generation is busy. Please try again shortly.', 'GENERATION_FAILED', 503);
  }
}
