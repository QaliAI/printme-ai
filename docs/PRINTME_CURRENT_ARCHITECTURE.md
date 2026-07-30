# PrintMe.ai Current Architecture

_Audited from `origin/master` / `16a7b6320be9162b199621f551c280f382c2ca5c` on 2026-07-29. No production data or remote configuration was read or changed._

## Runtime and repository

- Next.js 16.2.6 App Router, React 19.2.4, TypeScript 5, and Tailwind CSS 4.
- Supabase is used directly from browser components and from service-role route handlers.
- Stripe Checkout is created in `app/api/checkout/route.ts`; its webhook creates the local order and currently attempts Printify fulfillment.
- Cloudinary and an image-provider abstraction support uploads and generated designs.
- There was no test runner, end-to-end framework, or CI configuration on the default branch.

## Route and component shape

- `app/layout.tsx` renders the shared navbar and global styles.
- `app/page.tsx` is the live marketing homepage. Sprint 1 will not import or mount the commerce configurator here.
- `/app/create/*` is the existing authenticated creation flow.
- `/app/cart` is the existing Supabase-backed cart page.
- `/api/printify/mockups` uploads artwork and creates Printify draft products to obtain official mockups.
- `/api/cart/add-items`, `/api/checkout`, and Stripe/Printify webhooks form the existing commerce path.
- `/admin/*` reads commerce records through Supabase.

## Data model

The checked-in SQL defines `products`, `product_variants`, `carts`, `cart_items`, `orders`, and `order_items`. Product/provider/variant identifiers are optional string columns. The repository also says later migrations were applied directly to a named Supabase project, but most of those migration files are not present on the default branch.

There is material schema drift:

- application code queries columns such as `design_url`, `emoji`, `mockup_url`, `total_amount`, and `stripe_session_id` that differ from `database.sql`;
- `DATABASE_MIGRATIONS.md` and `migrations/README.md` describe remote changes that cannot be reconstructed solely from checked-in numbered migrations;
- `cart_items` stores foreign keys, quantity, and unit price, but no immutable product/design/placement/preview snapshot;
- `/api/cart/add-items` does not populate every non-null field declared by `database.sql`.

The existing persistent cart therefore cannot meet Sprint 1 configuration-preservation requirements without an additive schema change. Sprint 1 will use an isolated local-storage cart adapter on `/shop-v2` and propose, but not execute, an additive JSONB snapshot migration.

## Security boundaries

- Secret tokens use non-public environment variables, except that legacy code also looks for `NEXT_PUBLIC_PRINTIFY_SHOP_ID`. A shop ID is not an API credential, but new server code will use only `PRINTIFY_SHOP_ID`.
- Printify calls currently originate in server route handlers and server webhook code. The replacement adapter will include `server-only` so accidental browser imports fail at build time.
- The existing Stripe webhook attempts fulfillment after payment. Sprint 1 tests use mocked transport only and do not create or submit live Printify orders.
- The Printify webhook contains a verification TODO and currently accepts unverified JSON when configured.

## Baseline commands

| Command | Untouched default-branch result |
| --- | --- |
| `npm ci` | Passed; 410 packages installed; audit reported 6 vulnerabilities (1 low, 5 high). |
| `npm run lint` | Failed: 63 findings (35 errors, 28 warnings), including pre-existing hook-order, explicit-`any`, unescaped-entity, empty-interface, and image warnings. |
| `npx tsc --noEmit` | Passed. |
| `npm run build` | Passed; 30 routes generated. Warned that Next.js inferred `C:\Users\omino` as the workspace root because another lockfile exists above the repository. |
| `npm test` | Failed because no `test` script existed. |

## Sprint 1 isolation

`/shop-v2` will be a server-gated route controlled by `NEXT_PUBLIC_COMMERCE_V2_ENABLED`. Its fixture catalog, preview templates, cart state, and client bundle will remain isolated from the live homepage and existing production cart. The flag defaults to disabled.
