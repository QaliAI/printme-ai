import { instant2dRenderer, placementFromConfiguration } from './placement';
import { getPreviewTemplate } from './templates';
import type {
  DesignAsset,
  MerchProduct,
  ProductConfiguration,
  ProductVariant,
} from './types';

export type PreflightSeverity = 'info' | 'warning' | 'blocking';
export type PreflightCode =
  | 'good-to-print'
  | 'unsupported-file-type'
  | 'excessive-file-size'
  | 'may-appear-soft'
  | 'outside-safe-area'
  | 'bleed-risk'
  | 'transparent-padding'
  | 'very-small-artwork'
  | 'very-thin-lines'
  | 'low-contrast'
  | 'potential-cropping';

export interface PreflightFinding {
  code: PreflightCode;
  severity: PreflightSeverity;
  message: string;
  detail: string;
}

export interface DesignPreflightReport {
  sourceWidth: number;
  sourceHeight: number;
  effectiveDpi: number | null;
  findings: PreflightFinding[];
  primary: PreflightFinding;
  canAddToCart: boolean;
}

function selectedPlaceholder(
  product: MerchProduct,
  variant: ProductVariant,
  configuration: ProductConfiguration,
) {
  return variant.placeholders.find(
    (placeholder) =>
      placeholder.position === configuration.printPosition &&
      placeholder.decorationMethod === configuration.decorationMethod,
  );
}

function effectiveDpi(
  asset: DesignAsset,
  placeholder: ReturnType<typeof selectedPlaceholder>,
  configuration: ProductConfiguration,
) {
  if (
    !placeholder?.printWidthInches ||
    !placeholder.printHeightInches
  ) {
    return null;
  }
  const sourceAspect = asset.width / asset.height;
  const targetAspect =
    placeholder.printWidthInches / placeholder.printHeightInches;
  let printedWidth = placeholder.printWidthInches;
  let printedHeight = placeholder.printHeightInches;

  if ((configuration.fit ?? 'contain') === 'contain') {
    if (sourceAspect > targetAspect) {
      printedHeight = printedWidth / sourceAspect;
    } else {
      printedWidth = printedHeight * sourceAspect;
    }
  }

  printedWidth *= configuration.normalizedScale;
  printedHeight *= configuration.normalizedScale;
  return Math.round(
    Math.min(
      asset.width / Math.max(printedWidth, 0.01),
      asset.height / Math.max(printedHeight, 0.01),
    ),
  );
}

function colorLuminance(color: string | null) {
  const known: Record<string, number> = {
    black: 0.02,
    white: 0.98,
    navy: 0.04,
    matte: 0.92,
  };
  return color ? known[color.toLowerCase()] : undefined;
}

export function runDesignPreflight(input: {
  asset: DesignAsset;
  configuration: ProductConfiguration;
  product: MerchProduct;
  variant: ProductVariant;
}): DesignPreflightReport {
  const template = getPreviewTemplate(input.configuration.previewTemplateId);
  const render = instant2dRenderer.render({
    artwork: input.asset,
    template,
    viewId: input.configuration.previewViewId,
    placement: placementFromConfiguration(input.configuration),
  });
  const placeholder = selectedPlaceholder(
    input.product,
    input.variant,
    input.configuration,
  );
  const dpi = effectiveDpi(input.asset, placeholder, input.configuration);
  const findings: PreflightFinding[] = [];
  const acceptedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

  if (!acceptedTypes.has(input.asset.mimeType)) {
    findings.push({
      code: 'unsupported-file-type',
      severity: 'blocking',
      message: 'Choose a supported image',
      detail: 'Use a JPEG, PNG, or WebP file.',
    });
  }
  if (input.asset.byteSize && input.asset.byteSize > 10 * 1024 * 1024) {
    findings.push({
      code: 'excessive-file-size',
      severity: 'blocking',
      message: 'Choose a smaller image',
      detail: 'The maximum upload size is 10 MB.',
    });
  }
  if (!render.isWithinSafeZone) {
    findings.push({
      code: 'outside-safe-area',
      severity: 'blocking',
      message: 'Outside the safe print area',
      detail: 'Move or resize the artwork before adding it.',
    });
    findings.push({
      code: 'bleed-risk',
      severity: 'warning',
      message: 'Artwork is close to the print edge',
      detail: 'Small production shifts could trim part of the artwork.',
    });
  }
  if (dpi !== null && dpi < 150) {
    findings.push({
      code: 'may-appear-soft',
      severity: 'warning',
      message: 'May appear soft',
      detail: `Estimated output is ${dpi} DPI. A larger source image will print more clearly.`,
    });
  }
  if (Math.min(input.asset.width, input.asset.height) < 600) {
    findings.push({
      code: 'very-small-artwork',
      severity: 'warning',
      message: 'Artwork is very small',
      detail: 'Use a larger source image when possible.',
    });
  }
  if ((input.asset.transparentPaddingRatio ?? 0) > 0.3) {
    findings.push({
      code: 'transparent-padding',
      severity: 'warning',
      message: 'Extra transparent space detected',
      detail: 'Trimming empty edges may make the artwork easier to size.',
    });
  }
  if ((input.asset.minimumLineWidthPx ?? Number.POSITIVE_INFINITY) < 3) {
    findings.push({
      code: 'very-thin-lines',
      severity: 'warning',
      message: 'Some lines may print very thin',
      detail: 'Fine details can soften during production.',
    });
  }
  const productLuminance = colorLuminance(input.variant.color);
  if (
    productLuminance !== undefined &&
    input.asset.dominantLuminance !== undefined &&
    Math.abs(productLuminance - input.asset.dominantLuminance) < 0.2
  ) {
    findings.push({
      code: 'low-contrast',
      severity: 'warning',
      message: 'Low contrast on this color',
      detail: 'Try another product color or use a contrast treatment.',
    });
  }
  const sourceAspect = input.asset.width / input.asset.height;
  const placeholderAspect = placeholder
    ? placeholder.width / placeholder.height
    : sourceAspect;
  if (
    input.configuration.fit === 'cover' &&
    Math.abs(sourceAspect - placeholderAspect) / placeholderAspect > 0.08
  ) {
    findings.push({
      code: 'potential-cropping',
      severity: 'warning',
      message: 'Some artwork may be cropped',
      detail: 'Choose Contain to keep the entire image visible.',
    });
  }

  const good: PreflightFinding = {
    code: 'good-to-print',
    severity: 'info',
    message: 'Good to print',
    detail:
      'This preview is an estimate. Materials and screens can reproduce color differently.',
  };
  const primary =
    findings.find((finding) => finding.severity === 'blocking') ??
    findings.find((finding) => finding.severity === 'warning') ??
    good;

  return {
    sourceWidth: input.asset.width,
    sourceHeight: input.asset.height,
    effectiveDpi: dpi,
    findings: findings.length ? findings : [good],
    primary,
    canAddToCart: !findings.some(
      (finding) => finding.severity === 'blocking',
    ),
  };
}
