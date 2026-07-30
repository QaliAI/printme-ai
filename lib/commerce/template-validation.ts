import type {
  MerchProduct,
  PreviewTemplate,
  ProductVariant,
} from './types';

export type TemplateValidationCode =
  | 'missing-variant-mapping'
  | 'unsupported-decoration-method'
  | 'missing-template'
  | 'missing-view'
  | 'missing-mockup'
  | 'missing-safe-zone'
  | 'placeholder-dimension-mismatch'
  | 'incorrect-aspect-ratio';

export interface TemplateValidationIssue {
  code: TemplateValidationCode;
  productId: string;
  variantId: string;
  detail: string;
}

function issue(
  code: TemplateValidationCode,
  product: MerchProduct,
  variant: ProductVariant,
  detail: string,
): TemplateValidationIssue {
  return { code, productId: product.id, variantId: variant.id, detail };
}

export function validateProductTemplates(
  products: MerchProduct[],
  templates: PreviewTemplate[],
): TemplateValidationIssue[] {
  const templateMap = new Map(
    templates.map((template) => [template.id, template]),
  );
  const issues: TemplateValidationIssue[] = [];

  for (const product of products) {
    for (const variant of product.variants) {
      for (const placeholder of variant.placeholders) {
        if (
          !product.provider.decorationMethods.includes(
            placeholder.decorationMethod,
          )
        ) {
          issues.push(
            issue(
              'unsupported-decoration-method',
              product,
              variant,
              `${placeholder.decorationMethod} is not approved for ${product.provider.name}.`,
            ),
          );
        }

        const binding = product.previewBindings?.find(
          (candidate) =>
            candidate.printifyBlueprintId === product.printifyBlueprintId &&
            candidate.printifyProviderId ===
              product.provider.printifyProviderId &&
            candidate.printifyVariantId === variant.printifyVariantId &&
            candidate.productColor === variant.color &&
            candidate.printPosition === placeholder.position &&
            candidate.decorationMethod === placeholder.decorationMethod,
        );
        if (!binding) {
          issues.push(
            issue(
              'missing-variant-mapping',
              product,
              variant,
              `No preview binding exists for ${placeholder.position}.`,
            ),
          );
          continue;
        }

        const template = templateMap.get(binding.previewTemplateId);
        if (!template) {
          issues.push(
            issue(
              'missing-template',
              product,
              variant,
              `Template ${binding.previewTemplateId} does not exist.`,
            ),
          );
          continue;
        }
        const view = template.views.find(
          (candidate) =>
            candidate.id === binding.previewViewId &&
            candidate.position === binding.printPosition,
        );
        if (!view) {
          issues.push(
            issue(
              'missing-view',
              product,
              variant,
              `View ${binding.previewViewId} does not exist at ${binding.printPosition}.`,
            ),
          );
          continue;
        }
        if (!view.baseProductImage) {
          issues.push(
            issue(
              'missing-mockup',
              product,
              variant,
              `View ${view.id} has no base product image.`,
            ),
          );
        }
        if (view.safeZoneInset <= 0) {
          issues.push(
            issue(
              'missing-safe-zone',
              product,
              variant,
              `View ${view.id} has no safe-zone inset.`,
            ),
          );
        }
        if (
          view.placeholderWidth !== placeholder.width ||
          view.placeholderHeight !== placeholder.height
        ) {
          issues.push(
            issue(
              'placeholder-dimension-mismatch',
              product,
              variant,
              `${view.placeholderWidth}x${view.placeholderHeight} does not match ${placeholder.width}x${placeholder.height}.`,
            ),
          );
        }
        const viewAspect = view.printArea.width / view.printArea.height;
        const placeholderAspect = placeholder.width / placeholder.height;
        if (
          Math.abs(viewAspect - placeholderAspect) / placeholderAspect >
          0.03
        ) {
          issues.push(
            issue(
              'incorrect-aspect-ratio',
              product,
              variant,
              `View aspect ${viewAspect.toFixed(3)} does not match placeholder aspect ${placeholderAspect.toFixed(3)}.`,
            ),
          );
        }
      }
    }
  }

  return issues;
}
