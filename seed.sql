-- Insert Style Presets
INSERT INTO style_presets (name, slug, description, best_for, sample_before_url, sample_after_url, prompt_template, negative_prompt, is_active, sort_order) VALUES
  ('Oil Painting Portrait', 'oil-painting-portrait', 'Rich, textured oil painting style with warm tones', 'Portraits, family photos', 'https://via.placeholder.com/400x400?text=Original', 'https://via.placeholder.com/400x400?text=Oil+Painting', 'Convert this image into a beautiful oil painting portrait style with rich textures, warm golden tones, and artistic brushstrokes. Maintain facial features clearly.', 'blur, low quality, pixelated, cartoon, sketch', true, 1),
  ('Watercolor Memory', 'watercolor-memory', 'Soft, dreamy watercolor aesthetic', 'Travel photos, memories', 'https://via.placeholder.com/400x400?text=Original', 'https://via.placeholder.com/400x400?text=Watercolor', 'Transform this photo into a soft, dreamy watercolor painting with beautiful color washes and artistic flows. Keep details visible but painterly.', 'harsh, digital, photorealistic, sharp edges', true, 2),
  ('Pop Art Poster', 'pop-art-poster', 'Bold, vibrant pop art with comic-like colors', 'Portraits, bold graphics', 'https://via.placeholder.com/400x400?text=Original', 'https://via.placeholder.com/400x400?text=Pop+Art', 'Create a striking pop art poster from this image with bold, vibrant colors, high contrast, and comic book style. Use bright primary colors.', 'muted, dull, realistic, subtle', true, 3),
  ('Vintage Travel Poster', 'vintage-travel-poster', 'Retro 1950s travel poster aesthetic', 'Landscapes, travel', 'https://via.placeholder.com/400x400?text=Original', 'https://via.placeholder.com/400x400?text=Vintage', 'Convert to a vintage 1950s travel poster style with retro colors, simple shapes, and nostalgic artwork aesthetic', 'modern, photorealistic, detailed, 3d', true, 4),
  ('Black & White Editorial', 'black-white-editorial', 'Professional black and white editorial photography style', 'Portraits, professional', 'https://via.placeholder.com/400x400?text=Original', 'https://via.placeholder.com/400x400?text=B&W', 'Create a striking black and white editorial photograph with high contrast, dramatic lighting, and professional magazine quality', 'color, dull, low contrast', true, 5),
  ('Cartoon Gift Style', 'cartoon-gift-style', 'Cute, friendly cartoon illustration perfect for gifts', 'People, pets, any subject', 'https://via.placeholder.com/400x400?text=Original', 'https://via.placeholder.com/400x400?text=Cartoon', 'Convert this photo into a friendly, cute cartoon illustration style that is perfect for gifts and merchandise. Keep a recognizable look.', 'photorealistic, dark, scary, detailed', true, 6),
  ('Pet Royal Portrait', 'pet-royal-portrait', 'Royal, regal portrait style for pets and animals', 'Pet photos', 'https://via.placeholder.com/400x400?text=Original', 'https://via.placeholder.com/400x400?text=Royal', 'Create a royal, regal portrait of this pet or animal in classical painting style with ornate background elements, crown, or formal attire.', 'blurry, abstract, modern, low quality', true, 7),
  ('Pencil Sketch', 'pencil-sketch', 'Detailed pencil sketch with shading', 'Any subject', 'https://via.placeholder.com/400x400?text=Original', 'https://via.placeholder.com/400x400?text=Sketch', 'Convert this image into a detailed pencil sketch with professional shading, line work, and realistic proportions', 'color, painted, digital, blurry', true, 8),
  ('Modern Minimal Line Art', 'modern-minimal-line-art', 'Minimalist line art with geometric elements', 'Contemporary art', 'https://via.placeholder.com/400x400?text=Original', 'https://via.placeholder.com/400x400?text=Line+Art', 'Create a modern minimalist line art version with clean geometric shapes, single or dual color palette, and artistic simplification', 'photorealistic, detailed, colorful, noisy', true, 9),
  ('Cinematic Poster', 'cinematic-poster', 'Movie poster quality cinematic style', 'Portraits, dramatic scenes', 'https://via.placeholder.com/400x400?text=Original', 'https://via.placeholder.com/400x400?text=Cinematic', 'Transform this into a cinematic movie poster with dramatic lighting, professional color grading, and blockbuster movie aesthetic', 'casual, amateurish, low quality, washed out', true, 10),
  ('Toy Figurine Style', 'toy-figurine-style', 'Cute 3D toy or figurine inspired style', 'Any subject', 'https://via.placeholder.com/400x400?text=Original', 'https://via.placeholder.com/400x400?text=Toy', 'Render this as a cute 3D toy or action figure with plastic-like appearance, bright colors, and friendly proportions', 'photorealistic, dark, serious, detailed', true, 11),
  ('Clean Cutout', 'clean-cutout', 'Subject isolated with clean background removed', 'Product photos, any subject', 'https://via.placeholder.com/400x400?text=Original', 'https://via.placeholder.com/400x400?text=Cutout', 'Remove the background cleanly and create a crisp subject isolation on white background. Perfect for product mockups.', 'busy background, blurry edges, fuzzy', true, 12);

-- Insert Products
INSERT INTO products (name, slug, description, category, base_price, retail_price, mockup_template_url, print_area_config, is_active, sort_order) VALUES
  ('Canvas Print', 'canvas-print', 'Premium gallery-wrapped canvas print', 'canvas', 29.99, 49.99, 'https://via.placeholder.com/600x600?text=Canvas', '{"x": 50, "y": 50, "width": 500, "height": 500, "scale_min": 0.8, "scale_max": 1.2}', true, 1),
  ('Framed Poster', 'framed-poster', 'Elegant framed art print', 'poster', 34.99, 59.99, 'https://via.placeholder.com/600x600?text=Framed', '{"x": 40, "y": 40, "width": 520, "height": 520}', true, 2),
  ('Premium Poster', 'premium-poster', 'High-quality matte finish poster', 'poster', 14.99, 24.99, 'https://via.placeholder.com/600x600?text=Poster', '{"x": 30, "y": 30, "width": 540, "height": 540}', true, 3),
  ('Coffee Mug', 'coffee-mug', 'Ceramic coffee mug 11 oz', 'mug', 9.99, 16.99, 'https://via.placeholder.com/600x600?text=Mug', '{"x": 80, "y": 100, "width": 300, "height": 250}', true, 4),
  ('T-Shirt', 'tshirt', 'Premium cotton unisex t-shirt', 'apparel', 14.99, 29.99, 'https://via.placeholder.com/600x600?text=TShirt', '{"x": 100, "y": 120, "width": 350, "height": 350}', true, 5),
  ('Hoodie', 'hoodie', 'Comfortable pullover hoodie', 'apparel', 29.99, 59.99, 'https://via.placeholder.com/600x600?text=Hoodie', '{"x": 100, "y": 150, "width": 380, "height": 380}', true, 6),
  ('Sticker Pack', 'sticker-pack', 'Set of 4 vinyl stickers', 'sticker', 4.99, 9.99, 'https://via.placeholder.com/600x600?text=Stickers', '{"x": 50, "y": 50, "width": 250, "height": 250}', true, 7),
  ('Phone Case', 'phone-case', 'Durable protective phone case (iPhone/Android)', 'phone-case', 14.99, 24.99, 'https://via.placeholder.com/600x600?text=Phone', '{"x": 60, "y": 100, "width": 200, "height": 350}', true, 8),
  ('Tote Bag', 'tote-bag', 'Canvas tote bag for everyday use', 'bag', 12.99, 21.99, 'https://via.placeholder.com/600x600?text=Tote', '{"x": 80, "y": 120, "width": 400, "height": 380}', true, 9),
  ('Digital Download', 'digital-download', 'High-resolution digital image file (4K)', 'digital', 4.99, 9.99, 'https://via.placeholder.com/600x600?text=Digital', '{"x": 0, "y": 0, "width": 4000, "height": 4000}', true, 10);

-- Insert Product Variants
INSERT INTO product_variants (product_id, name, size, color, price_modifier, is_active) VALUES
  ((SELECT id FROM products WHERE slug = 'canvas-print'), '8x8 Canvas', '8x8', NULL, 0, true),
  ((SELECT id FROM products WHERE slug = 'canvas-print'), '11x14 Canvas', '11x14', NULL, 5.00, true),
  ((SELECT id FROM products WHERE slug = 'canvas-print'), '16x20 Canvas', '16x20', NULL, 10.00, true),
  ((SELECT id FROM products WHERE slug = 'framed-poster'), '8x10 Frame', '8x10', 'Black', 0, true),
  ((SELECT id FROM products WHERE slug = 'framed-poster'), '11x14 Frame', '11x14', 'Black', 5.00, true),
  ((SELECT id FROM products WHERE slug = 'framed-poster'), '11x14 Frame', '11x14', 'White', 5.00, true),
  ((SELECT id FROM products WHERE slug = 'premium-poster'), 'A3 (11x17)', 'A3', NULL, 0, true),
  ((SELECT id FROM products WHERE slug = 'premium-poster'), 'A2 (16x24)', 'A2', NULL, 2.00, true),
  ((SELECT id FROM products WHERE slug = 'coffee-mug'), '11 oz Mug', 'Standard', 'White', 0, true),
  ((SELECT id FROM products WHERE slug = 'coffee-mug'), '15 oz Mug', 'Large', 'White', 1.00, true),
  ((SELECT id FROM products WHERE slug = 'tshirt'), 'Small', 'S', 'White', 0, true),
  ((SELECT id FROM products WHERE slug = 'tshirt'), 'Medium', 'M', 'White', 0, true),
  ((SELECT id FROM products WHERE slug = 'tshirt'), 'Large', 'L', 'White', 0, true),
  ((SELECT id FROM products WHERE slug = 'tshirt'), 'X-Large', 'XL', 'White', 0, true),
  ((SELECT id FROM products WHERE slug = 'tshirt'), 'Large', 'L', 'Black', 0, true),
  ((SELECT id FROM products WHERE slug = 'hoodie'), 'Small', 'S', 'Black', 0, true),
  ((SELECT id FROM products WHERE slug = 'hoodie'), 'Medium', 'M', 'Black', 0, true),
  ((SELECT id FROM products WHERE slug = 'hoodie'), 'Large', 'L', 'Black', 0, true),
  ((SELECT id FROM products WHERE slug = 'phone-case'), 'iPhone 15', 'iPhone 15', NULL, 0, true),
  ((SELECT id FROM products WHERE slug = 'phone-case'), 'iPhone 14', 'iPhone 14', NULL, 0, true),
  ((SELECT id FROM products WHERE slug = 'phone-case'), 'Samsung S24', 'Samsung S24', NULL, 0, true),
  ((SELECT id FROM products WHERE slug = 'tote-bag'), 'Natural Canvas', NULL, 'Natural', 0, true),
  ((SELECT id FROM products WHERE slug = 'tote-bag'), 'Black Canvas', NULL, 'Black', 0, true),
  ((SELECT id FROM products WHERE slug = 'digital-download'), 'Digital File', '4K', NULL, 0, true);
