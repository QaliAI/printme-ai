# PrintMe.ai - AI Print-on-Demand Platform MVP

A mobile-first web application that allows users to transform photos using AI art styles and order custom printed products. Built with Next.js, TypeScript, Supabase, and Stripe.

## Features

### User Flow
1. **Upload & Style** - Select an AI art style and upload a photo
2. **Generate** - Our AI transforms the photo using the selected style
3. **Preview** - Review the generated design with before/after comparison
4. **Products** - Select products to print the design on (canvas, poster, mug, t-shirt, etc.)
5. **Checkout** - Add items to cart and proceed to secure checkout via Stripe
6. **Order** - Track order status and fulfillment progress

### Available Styles
- Oil Painting, Watercolor, Pop Art, Vintage, B&W Editorial
- Cartoon, Pet Royal, Sketch, Line Art, Cinematic, Toy, Cutout

### Products
Canvas, Poster, Mug, T-Shirt, Hoodie, Sticker, Phone Case, Tote Bag, Digital Download

## Tech Stack

- **Frontend:** Next.js 14 with App Router, TypeScript, Tailwind CSS, React Hook Form
- **Backend:** Node.js API routes, Zod validation
- **Database:** Supabase (PostgreSQL) with Row-Level Security
- **Storage:** Supabase Storage for images, Cloudinary for transforms
- **Authentication:** Supabase Auth with JWT
- **Payments:** Stripe Checkout (scaffolded, ready for production)
- **Fulfillment:** Printify API (scaffolded, ready for production)
- **AI:** OpenAI DALL-E 3 (via abstraction layer, mock provider for dev)

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- A Supabase project
- (Optional) OpenAI API key for real image generation
- (Optional) Stripe account for payments
- (Optional) Printify account for fulfillment

### Installation

1. **Clone and install:**
```bash
git clone <repo>
cd printme-ai
npm install
```

2. **Set up environment variables:**
```bash
cp .env.example .env.local
```

Edit `.env.local` with your actual values (see [.env.example](.env.example) for required keys).

3. **Set up Supabase:**
```bash
# Create tables and policies
psql -h <host> -U <user> -d <database> < database.sql

# Seed initial data (styles and products)
psql -h <host> -U <user> -d <database> < seed.sql
```

4. **Create admin user:**
Add your email to `ADMIN_EMAILS` in `.env.local`. Sign up with that email to automatically grant admin access.

5. **Run development server:**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
app/
├── page.tsx                    # Landing page
├── layout.tsx                  # Root layout with navbar
├── auth/                       # Authentication pages
│   ├── signup/
│   ├── signin/
│   ├── signout/
│   └── verify-email/
├── app/                        # Protected app routes
│   ├── page.tsx               # Dashboard
│   ├── create/                 # Design creation flow
│   │   ├── style/             # Style selection
│   │   ├── upload/            # Image upload
│   │   ├── preview/           # Design preview
│   │   └── products/          # Product selection
│   ├── cart/                   # Shopping cart
│   ├── orders/                 # Order history
│   └── designs/                # Design management
├── admin/                      # Admin dashboard (protected)
│   ├── layout.tsx             # Admin layout with sidebar
│   ├── page.tsx               # Dashboard overview
│   ├── orders/
│   ├── products/
│   ├── designs/
│   └── styles/
├── api/                        # API routes
│   ├── generate-design/       # AI generation
│   ├── cart/                  # Cart operations
│   ├── checkout/              # Stripe integration
│   ├── orders/                # Order endpoints
│   └── webhooks/              # Stripe and Printify webhooks
├── components/                 # Reusable UI components
└── lib/                        # Utilities and services
    ├── auth.ts                # Auth functions
    ├── supabase.ts            # Supabase client
    ├── validation.ts          # Zod schemas
    ├── types.ts               # TypeScript types
    ├── ai/                    # AI provider abstraction
    │   ├── image-provider.ts  # Interface
    │   ├── mock-image-provider.ts
    │   └── openai-image-provider.ts
    └── printify/              # Printify client
```

## Key Concepts

### AI Provider Abstraction
The `lib/ai/image-provider.ts` interface allows swapping between mock and real implementations:
- **Mock** (development): Returns placeholder images instantly
- **OpenAI** (production): Generates real images using DALL-E 3

Set `AI_PROVIDER=openai` in `.env.local` to use real generation.

### Row-Level Security
All database queries use Supabase RLS policies for automatic user data isolation. Users can only access their own orders, designs, and cart.

### Type Safety
Full TypeScript coverage with:
- Zod schemas for runtime validation
- Generated types from database schema via Supabase types
- Strict mode enabled

## Development Workflow

### Adding a New Page
1. Create folder in `app/` (e.g., `app/new-feature/`)
2. Add `page.tsx` with your component
3. Use existing components from `components/`
4. Query database via Supabase client in `lib/supabase.ts`

### Adding an API Endpoint
1. Create folder in `app/api/` (e.g., `app/api/new-endpoint/`)
2. Create `route.ts` with POST/GET/etc handler
3. Use Supabase admin client for backend operations
4. Validate input with Zod schemas from `lib/validation.ts`
5. Return `NextResponse.json()`

### Styling
Use Tailwind CSS classes. Component variants are defined in `components/`. For global styles, edit `app/layout.tsx`.

## Deployment

### Vercel (Recommended)
```bash
npm install -g vercel
vercel login
vercel
```

Set environment variables in Vercel project settings (copy from `.env.local`).

### Docker
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

## Next Steps for Production

See [TODO.md](TODO.md) for a detailed checklist. Key items:

1. **Connect Real APIs:**
   - [ ] OpenAI DALL-E for image generation
   - [ ] Stripe for payments
   - [ ] Printify for order fulfillment

2. **Add Missing Pages:**
   - [ ] Order detail pages
   - [ ] User account settings
   - [ ] Admin management interfaces

3. **Testing & Monitoring:**
   - [ ] End-to-end testing with Playwright
   - [ ] Error tracking (Sentry)
   - [ ] Analytics (PostHog)
   - [ ] Email notifications

4. **Compliance:**
   - [ ] Privacy policy
   - [ ] Terms of service
   - [ ] GDPR compliance (especially for EU users)

## API Documentation

### POST `/api/generate-design`
Generate AI design from uploaded image.
```json
{
  "uploadId": "uuid",
  "styleId": "uuid",
  "imageUrl": "https://..."
}
```

### POST `/api/cart/add-items`
Add items to user's cart.
```json
{
  "designId": "uuid",
  "items": [
    {
      "productId": "uuid",
      "variantId": "uuid",
      "quantity": 1
    }
  ]
}
```

### POST `/api/checkout`
Create Stripe checkout session.
```json
{
  "cartId": "uuid"
}
```

## Troubleshooting

### Auth Issues
- Check `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Verify email in Supabase auth confirmation
- Clear browser cookies and restart dev server

### Database Connection
- Test Supabase connection: `psql -h <host> -U <user> -d <database>`
- Check RLS policies in Supabase dashboard
- Verify service role key in `.env.local`

### AI Generation Failing
- Set `AI_PROVIDER=mock` to test with mock provider
- Check OpenAI API key and quota
- Monitor API errors in browser console

## License

Private project - not for public distribution.

## Support

For issues or questions, contact the development team.
