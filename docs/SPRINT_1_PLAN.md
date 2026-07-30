# Sprint 1 Plan

## Goal

Deliver a disabled-by-default `/shop-v2` fixture slice:

`curated design → recommended product → proportional instant preview → switch product → exact local cart snapshot`

## Checkpoints

1. Audit the default branch, record baseline failures, document architecture, Printify defects, plan, and risks.
2. Replace the Printify transport with a server-only, typed, validated adapter and fixture contracts.
3. Add canonical commerce models, renderer adapter, deterministic placement math, two authored preview templates, and an additive unexecuted migration.
4. Add five curated fixtures and a mobile-first `/shop-v2` experience with product sheet and local cart drawer.
5. Add unit, integration, and 375px end-to-end coverage.
6. Record final results and a prioritized Sprint 2 backlog.

## Implementation boundaries

- Preserve `app/page.tsx` and current homepage imports.
- Use only poster and front-facing T-shirt templates.
- Use local responsive assets with explicit dimensions.
- Keep static page content in a Server Component and isolate interactivity in the `/shop-v2` client component.
- Keep all Printify authentication and live smoke behavior on the server.
- Do not create Printify products or orders in UI or tests.
- Do not execute SQL remotely.
- Do not deploy or merge.

## Verification

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run test:e2e`
- `npm run build`
- Browser CLI check at 375px and desktop widths
- Secret-name/status checks without printing values
- Git diff and commit audit
