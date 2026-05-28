-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_is_admin ON profiles(is_admin);

-- Style Presets
CREATE TABLE IF NOT EXISTS style_presets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  best_for TEXT,
  sample_before_url TEXT,
  sample_after_url TEXT,
  prompt_template TEXT NOT NULL,
  negative_prompt TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_style_presets_slug ON style_presets(slug);
CREATE INDEX idx_style_presets_active ON style_presets(is_active);

-- User Uploads
CREATE TABLE IF NOT EXISTS user_uploads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_file_name TEXT NOT NULL,
  original_url TEXT NOT NULL,
  file_size INTEGER,
  image_width INTEGER,
  image_height INTEGER,
  has_face BOOLEAN DEFAULT FALSE,
  quality_score FLOAT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_user_uploads_user_id ON user_uploads(user_id);
CREATE INDEX idx_user_uploads_created_at ON user_uploads(created_at DESC);

-- Generated Designs
CREATE TABLE IF NOT EXISTS generated_designs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  upload_id UUID NOT NULL REFERENCES user_uploads(id) ON DELETE CASCADE,
  style_preset_id UUID NOT NULL REFERENCES style_presets(id),
  original_image_url TEXT NOT NULL,
  generated_image_url TEXT,
  thumbnail_url TEXT,
  status TEXT DEFAULT 'pending', -- pending, generating, completed, failed
  error_message TEXT,
  ai_provider TEXT DEFAULT 'mock',
  ai_request_id TEXT,
  prompt_used TEXT,
  is_approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_generated_designs_user_id ON generated_designs(user_id);
CREATE INDEX idx_generated_designs_status ON generated_designs(status);
CREATE INDEX idx_generated_designs_created_at ON generated_designs(created_at DESC);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT NOT NULL, -- canvas, poster, mug, tshirt, hoodie, tote, phone-case, sticker, digital, etc.
  base_price DECIMAL(10, 2) NOT NULL,
  retail_price DECIMAL(10, 2) NOT NULL,
  mockup_template_url TEXT,
  print_area_config JSONB, -- {x, y, width, height, scale_min, scale_max, ...}
  printify_blueprint_id TEXT, -- TODO: Set in Printify integration
  printify_provider_id TEXT, -- TODO: Set in Printify integration
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_active ON products(is_active);

-- Product Variants
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., "11x14 Canvas", "Large Mug"
  color TEXT,
  size TEXT,
  price_modifier DECIMAL(10, 2) DEFAULT 0,
  printify_variant_id TEXT, -- TODO: Set in Printify integration
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_product_variants_product_id ON product_variants(product_id);

-- Carts
CREATE TABLE IF NOT EXISTS carts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active', -- active, abandoned, converted
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_carts_user_id ON carts(user_id);
CREATE INDEX idx_carts_status ON carts(status);

-- Cart Items
CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  design_id UUID NOT NULL REFERENCES generated_designs(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_cart_items_cart_id ON cart_items(cart_id);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cart_id UUID REFERENCES carts(id),
  status TEXT DEFAULT 'pending', -- pending, paid, processing, shipped, delivered, cancelled, failed
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  printify_order_id TEXT,
  subtotal DECIMAL(10, 2) NOT NULL,
  shipping DECIMAL(10, 2) DEFAULT 0,
  tax DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL,
  customer_email TEXT,
  shipping_address JSONB,
  notes TEXT,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_stripe_payment_intent_id ON orders(stripe_payment_intent_id);
CREATE INDEX idx_orders_printify_order_id ON orders(printify_order_id);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- Order Items
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  design_id UUID NOT NULL REFERENCES generated_designs(id),
  product_id UUID NOT NULL REFERENCES products(id),
  product_variant_id UUID NOT NULL REFERENCES product_variants(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  printify_line_item_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);

-- Webhook Events (audit trail)
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL, -- stripe.payment_intent.succeeded, printify.order.created, etc.
  event_source TEXT NOT NULL, -- stripe, printify
  event_id TEXT NOT NULL,
  order_id UUID REFERENCES orders(id),
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_webhook_events_event_type ON webhook_events(event_type);
CREATE INDEX idx_webhook_events_order_id ON webhook_events(order_id);
CREATE INDEX idx_webhook_events_processed ON webhook_events(processed);

-- Row Level Security (RLS) Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles (users can only see their own)
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for user_uploads (users can only see their own)
CREATE POLICY "Users can view own uploads" ON user_uploads
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create uploads" ON user_uploads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for generated_designs (users can only see their own)
CREATE POLICY "Users can view own designs" ON generated_designs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create designs" ON generated_designs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for carts (users can only see their own)
CREATE POLICY "Users can view own cart" ON carts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create cart" ON carts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for orders (users can only see their own)
CREATE POLICY "Users can view own orders" ON orders
  FOR SELECT USING (auth.uid() = user_id);

-- Comments on tables
COMMENT ON TABLE profiles IS 'User profile information extended from auth.users';
COMMENT ON TABLE user_uploads IS 'Original images uploaded by users before AI processing';
COMMENT ON TABLE generated_designs IS 'AI-generated/edited designs from user uploads';
COMMENT ON TABLE products IS 'Print-on-demand products available for printing designs';
COMMENT ON TABLE product_variants IS 'Variants of products (size, color, etc)';
COMMENT ON TABLE carts IS 'Shopping carts for users';
COMMENT ON TABLE orders IS 'Orders that have been placed by users';
COMMENT ON TABLE webhook_events IS 'Incoming webhooks from Stripe and Printify for audit/debugging';
