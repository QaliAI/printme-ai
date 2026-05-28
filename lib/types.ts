// Auth & User
export interface User {
  id: string;
  email: string;
}

export interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

// Style Presets
export interface StylePreset {
  id: string;
  name: string;
  slug: string;
  description?: string;
  best_for?: string;
  sample_before_url?: string;
  sample_after_url?: string;
  prompt_template: string;
  negative_prompt?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// Uploads
export interface UserUpload {
  id: string;
  user_id: string;
  original_file_name: string;
  original_url: string;
  file_size?: number;
  image_width?: number;
  image_height?: number;
  has_face?: boolean;
  quality_score?: number;
  created_at: string;
  updated_at: string;
}

// Generated Designs
export type DesignStatus = 'pending' | 'generating' | 'completed' | 'failed';

export interface GeneratedDesign {
  id: string;
  user_id: string;
  upload_id: string;
  style_preset_id: string;
  original_image_url: string;
  generated_image_url?: string;
  thumbnail_url?: string;
  status: DesignStatus;
  error_message?: string;
  ai_provider: string;
  ai_request_id?: string;
  prompt_used?: string;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
}

// Products
export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  category: string;
  base_price: number;
  retail_price: number;
  mockup_template_url?: string;
  print_area_config?: any;
  printify_blueprint_id?: string;
  printify_provider_id?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  color?: string;
  size?: string;
  price_modifier: number;
  printify_variant_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Cart
export interface Cart {
  id: string;
  user_id: string;
  status: 'active' | 'abandoned' | 'converted';
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  id: string;
  cart_id: string;
  design_id: string;
  product_id: string;
  product_variant_id: string;
  quantity: number;
  unit_price: number;
  created_at: string;
  updated_at: string;
}

// Orders
export type OrderStatus = 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'failed';

export interface Order {
  id: string;
  user_id: string;
  cart_id?: string;
  status: OrderStatus;
  stripe_payment_intent_id?: string;
  stripe_checkout_session_id?: string;
  printify_order_id?: string;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  customer_email?: string;
  shipping_address?: any;
  notes?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  design_id: string;
  product_id: string;
  product_variant_id: string;
  quantity: number;
  unit_price: number;
  printify_line_item_id?: string;
  created_at: string;
}

// Webhook
export interface WebhookEvent {
  id: string;
  event_type: string;
  event_source: 'stripe' | 'printify';
  event_id: string;
  order_id?: string;
  payload: any;
  processed: boolean;
  error_message?: string;
  created_at: string;
}

// API Responses
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// AI Generation
export interface GenerateDesignRequest {
  upload_id: string;
  style_preset_id: string;
}

export interface GenerateDesignResponse {
  design_id: string;
  status: DesignStatus;
  generated_image_url?: string;
}

// Stripe
export interface CreateCheckoutSessionRequest {
  cart_id: string;
  success_url: string;
  cancel_url: string;
}

// Printify
export interface PrintifyProduct {
  blueprint_id: string;
  title: string;
  description: string;
}

export interface PrintifyOrder {
  address_to: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    country: string;
    state: string;
    city: string;
    line1: string;
    line2?: string;
    zip: string;
  };
  line_items: Array<{
    product_id: string;
    variant_ids: number[];
    quantity: number;
    print_providers?: Array<{
      id: string;
    }>;
  }>;
  shipping_method?: number;
  is_express?: boolean;
}
