import { z } from 'zod';

// Image validation
export const imageFileSchema = z
  .instanceof(File)
  .refine(file => file.size <= 10 * 1024 * 1024, 'File must be smaller than 10MB')
  .refine(
    file => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type),
    'File must be JPEG, PNG, or WebP'
  );

export const uploadImageSchema = z.object({
  file: imageFileSchema,
  description: z.string().optional(),
});

// Design generation
export const generateDesignSchema = z.object({
  upload_id: z.string().uuid(),
  style_preset_id: z.string().uuid(),
});

// Cart operations
export const addToCartSchema = z.object({
  design_id: z.string().uuid(),
  product_id: z.string().uuid(),
  product_variant_id: z.string().uuid(),
  quantity: z.number().int().min(1).max(100),
});

export const updateCartItemSchema = z.object({
  cart_item_id: z.string().uuid(),
  quantity: z.number().int().min(1).max(100),
});

// Checkout
export const createCheckoutSessionSchema = z.object({
  cart_id: z.string().uuid(),
  success_url: z.string().url(),
  cancel_url: z.string().url(),
});

// Order creation
export const createOrderSchema = z.object({
  cart_id: z.string().uuid(),
  customer_email: z.string().email(),
  shipping_address: z.object({
    first_name: z.string().min(1),
    last_name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(1),
    country: z.string().min(2),
    state: z.string().min(1),
    city: z.string().min(1),
    line1: z.string().min(1),
    line2: z.string().optional(),
    zip: z.string().min(1),
  }),
});

// Admin operations
export const updateOrderStatusSchema = z.object({
  order_id: z.string().uuid(),
  status: z.enum(['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'failed']),
  notes: z.string().optional(),
});

// Helper to safely parse and validate
export async function validateAndParse<T>(schema: z.ZodSchema<T>, data: unknown): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const result = await schema.parseAsync(data);
    return { success: true, data: result };
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
      };
    }
    return {
      success: false,
      error: 'Validation failed',
    };
  }
}
