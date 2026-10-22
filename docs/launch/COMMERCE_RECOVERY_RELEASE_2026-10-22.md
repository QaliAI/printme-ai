# Paid commerce recovery: evidence and release procedure

**Decision: NO-GO for customer payments.** Engineering changes are proposed in this PR; migration 015 has not been applied to any hosted database. Checkout remains disabled. No cards charged, provider orders created, settings changed, merges performed or deployments requested.

## Base and read-only evidence

- Started on `fix/checkout-release-blockers`, HEAD `98bc935f5974fced90d9e14cfa91230bcc6aafc2`. Only pre-existing untracked `.freebuff/` and `brand/printmerobot/` were present; neither is part of the patch.
- Fetched actual `master`: `2ce378c6093b5e5a9e1aaa0fab18aa2954bdd429`. Created `codex/commerce-paid-order-recovery` from it. GitHub confirms #24, #27 and #28 merged. The Oct 19 launch report is historical.
- Supabase connector: canonical `vfgbvnfhvjmkmfmianpb`, `ACTIVE_HEALTHY`, PostgreSQL 17.6. Commerce sessions, receipts, jobs, attempts and notification outbox exist and have RLS enabled. Paid completion has the 11-argument totals signature; completion, job lock and receipt claim deny EXECUTE to both `anon` and `authenticated`.
- Catalog inspection found owner-scoped profile UPDATE/INSERT policies and privileges permitting changes to `profiles.is_admin`. Commerce admin authorization trusted that field. Existing admin profile count: **0**. Orders/outbox: **0 rows**; failed/stale receipts: **0**; duplicate non-null PaymentIntent groups: **0**. These are point-in-time counts, not backup evidence.
- Vercel project `prj_vzSgRBzVFzssleqC4iRg93stQRU3`: only four non-secret flags were read decrypted: production `COMMERCE_CHECKOUT_ENABLED=false`, `COMMERCE_PERSISTENCE_ENABLED=true`, `STRIPE_MODE=live`, `PRINTIFY_FULFILLMENT_MODE=draft`. Secret values were not decrypted. `STRIPE_LIVE_RELEASE_APPROVED`, Resend variables, `COMMERCE_OPERATIONS_SECRET`, `ADMIN_EMAILS`, and `PRINTIFY_WEBHOOK_SECRET` are absent from the environment-name inventory. Preview also lacks persistence and a webhook secret in that inventory. Stored API-key ownership/mode and deployed values remain unproved.
- Stripe connector identifies PrintMe.AI `acct_1RJH24Ht4L6bDSR1` in live mode. Read-only endpoint listing: `we_1UT4KnHt4L6bDSR1RByU2SmT` is enabled at `https://www.printme.ai/api/webhooks/stripe`, with `api_version=null`, subscribed only to completed, async succeeded, async failed and expired checkout sessions. A second endpoint is disabled. No refund/dispute subscriptions, test-mode delivery, Stripe Tax settings, merchant identity or shipping correctness were proved.

## Dependency checklist

Status describes the evidence available now. “Fixed in PR” does not mean released.

| ID | Classification | Dependency / result | Depends on / remaining action |
|---|---|---|---|
| A1 | ALREADY IMPLEMENTED / VERIFIED | Shipping + tax reconciliation, payment-mode rejection, paid-intent conflict guard, service-role-only RPCs and Linux visual-test handling are on master. | Existing unit tests; hosted RPC signatures/grants checked above. No totals redesign. |
| A2 | VERIFIED | Canonical database is active; commerce relations exist with RLS. | Full function/constraint/storage audit and backup proof still required before migration. |
| A3 | VERIFIED | Production checkout flag is explicitly false. | Preserve through all preparation; activation is a separate owner approval. |
| D1 | DEFECT — fixed in PR | Refund/dispute events were acknowledged without changing order state. | 015 + application release + Stripe event subscriptions. |
| D2 | DEFECT — fixed in PR | In-flight duplicate receipt could return success; crashed processing receipts were unrecoverable. | 015: active claims fail retryably; stale claims become replayable after five minutes. |
| D3 | DEFECT — fixed in PR | Draft response/local acknowledgement failures could permit duplicate provider POSTs; job lock did not validate current payment state. | 015 + service patch; uncertain/preparing jobs require operator reconciliation. |
| D4 | DEFECT — fixed in PR | Manual draft submission used a transition that accepted only `fulfillment_ready`; checks were separated from admission. | Atomic paid/hold/job-state check accepts manual-review drafts once. |
| D5 | DEFECT — fixed in PR | Email could be lost after payment commit; outbox errors were swallowed and attempts reset. | Confirmation enqueue now commits with payment; atomic claims preserve payload/attempts; authenticated retry endpoint. Resend setup/proof still blocked. |
| D6 | DEFECT — fixed in PR | User-editable profile privilege, ambient-cookie approval, and development authorization fallback. | Server-owned verified-email allowlist or operations secret; 015 blocks profile self-promotion. |
| D7 | DEFECT — fixed in PR | Simultaneous checkout keys could create multiple orders from one cart. Expired attempts never closed. | Serialize idempotency/cart admission, reuse identical pending snapshots, reject changed snapshots, process expiration/failure. |
| D8 | DEFECT — fixed in PR | Checkout kill switch blocked paid receipts/confirmation lookup; DB lookup failure could crash confirmation. | Signed matching-mode receipts and persisted status remain available with checkout off; DB failure displays pending. |
| D9 | DEFECT — fixed in PR | Preflight declared integrations ready after checking only some variable names. | Requires email/ops/webhook config and key-mode agreement; explicitly distinguishes configuration from service proof. |
| D10 | DEFECT — fixed in PR | Critical framework advisories and High production transitive dependencies. | Next/eslint config 16.4.2; compatible nanoid/source-map-js patches; production audit is zero. |
| B1 | BLOCKED | Hosted migration 015, deployment and actual authenticated API/RPC proof. | Backup, review, staging PostgreSQL rehearsal and explicit release approval. |
| B2 | BLOCKED / OWNER ACTION | Stripe test checkout, tax, provider shipping rates, test webhook proof and account public details. | Owner confirms correct test account/keys and isolated preview; no live charge as a substitute. |
| B3 | BLOCKED / OWNER ACTION | Resend sender/DNS, operations secret + allowlist, Printify webhook secret and delivery proof. | Configure only after owner approval; repeat preflight in target environment. |
| B4 | OWNER ACTION | Add refund/dispute subscriptions and pin webhook API version. | Application + 015 must be ready before event replay; use `2026-04-22.dahlia` or separately verify a new version. |
| B5 | BLOCKED / OWNER ACTION | Real manual draft/sample, refund cancellation and dispute response ownership. | Explicit approval for provider writes/physical production. Current task made none. |
| B6 | OWNER ACTION | Monitoring routing, staffed launch window, backup restore rehearsal, rollback authority. | Monitoring endpoint exists, but no external alert integration was configured. |

## Implemented behavior and limits

`commerce_payment_holds` stores sticky holds by PaymentIntent, even before an order is matched. Settlement and financial events serialize on that identifier. Refund totals use the maximum cumulative `charge.amount_refunded`, never the sum of refund-created/updated events. States distinguish `refund_pending`, `partially_refunded`, `refunded` and `disputed`. A later checkout event cannot restore paid status or fulfillment after a hold. Failed refunds and closed/won disputes retain a hold until merchant reconciliation; there is deliberately no automatic hold-release API.

Fulfillment admission checks current payment, cancellation and hold state in PostgreSQL. Uncertain draft/provider responses, failed local acknowledgement after a provider call, and abandoned preparing/submitting states do not automatically retry. Printify `external_id` is the local order UUID; it is a reconciliation key, not a verified provider idempotency guarantee. A hold arriving after an external production request has been admitted cannot retract that request: an operator must cancel/reconcile in Printify. Physical submission history is retained.

Checkout expiration/async failure closes unpaid attempts without cancelling paid orders. A paid event arriving after closure is still persisted but its fulfillment is cancelled for manual review. Multiple requests reuse the same unchanged pending snapshot; a changed cart receives a conflict until the old attempt is closed. The unit database runs on one PGlite connection: parallel request promises are tested, but multi-connection PostgreSQL contention/deadlock testing remains a staging release gate.

Confirmation emails are durable before receipt acknowledgement. `POST /api/admin/orders/{orderId}/notification` retries the persisted confirmation. No scheduler or external alert delivery was configured. A lost provider email acknowledgement can leave `sending`; wait five minutes and reconcile provider delivery before retry. Do not blindly resend beyond the provider idempotency-retention window. Pending pre-015 outbox rows with incomplete payloads need explicit reconstruction/review; the audited hosted outbox is empty.

Operational surfaces require credentials:

- `GET /api/commerce/operations`: failed/stale receipts, jobs needing attention, unsent notifications and hold counts; no customer payloads.
- `GET /api/commerce/webhooks/events?status=failed` and `?status=processing`: receipt diagnosis.
- `POST /api/commerce/webhooks/events/{stripe|printify}/{eventId}/replay`: failed/stale receipt replay. Stripe replay also attempts durable confirmation; fulfillment is recovered separately.
- `GET /api/commerce/fulfillment/jobs`: includes stuck preparation/submission, manual review and cancelled states.
- `POST /api/commerce/fulfillment/jobs/{orderId}/prepare`: paid-only preparation; ambiguous states fail closed.
- `GET /api/admin/orders/{orderId}/dry-run` and `POST /api/admin/orders/{orderId}/approve`: artwork/economics review and explicit manual production action. Approval in disabled/dry-run mode fails instead of rewriting readiness.

## Deterministic validation

| Command / evidence | Result |
|---|---|
| `npm run typecheck` | PASS; final rerun recorded with PR. |
| `npm run lint` (JSON reporter for bounded output) | PASS, 0 errors, 32 warnings on initial final pass. Generated worktrees/output are excluded; source rules are unchanged. |
| `npm test` | PASS: 244 passed / 3 skipped (51 test files passed / 2 skipped); includes real local PostgreSQL execution of 005–007, 012–015, reapplying 015, financial events through the actual webhook service, and role-denial tests. Counts include the final checkout-expiration and confirmation-error regressions. |
| `npm run build` | PASS on Next.js 16.4.2; final rerun recorded with PR. No deployment. |
| `PLAYWRIGHT_LOCAL_PORT=3313 npm run test:e2e -- --workers=3` | Full suite PASS: 96 passed / 15 intentionally skipped; final full rerun: 96 passed / 15 skipped. Default port 3100 was occupied; existing server was left untouched. |
| `npm run preflight` | **BLOCKED**, exit 1: local Resend key/from/support, operations secret and Printify webhook secret missing. Production name inventory additionally lacks ADMIN_EMAILS. This is not live service proof. |
| `npm audit --omit=dev` | PASS, 0 findings after security updates. Full audit retains 8 High / 2 Moderate development-tool findings; no newly introduced PGlite advisory. No forced downgrade/blanket ignores. |
| Actual Stripe TEST checkout, Resend delivery, provider draft, hosted migration/security proof | **BLOCKED / NOT RUN**. Synthetic Stripe signatures and local PostgreSQL do not substitute for these gates. |

Cases covered: shipping+tax totals and mismatches; delayed payment; duplicate/active/stale receipts; out-of-order refunds and dispute closure; lost DB acknowledgement after commit; conflicting PaymentIntent; provider outage/lost draft acknowledgement; refusal of uncertain retries; one-time draft production admission; held/unpaid/cancelled order protection; notification claims/retries; simultaneous checkout requests and snapshot conflicts; anonymous/authenticated RPC denial; profile privilege assignment; unauthorized recovery APIs; confirmation DB outage and kill-switch behavior.

Browser runs emitted image-loading/hydration warnings after the framework security update. Assertions passed, including checkout flows; no claim of a warning-free browser console or a new homepage/creator redesign is made. Gitleaks/Semgrep were not run; review used the changed-file diff, role tests and npm audit. No secrets or environment files belong in the PR.

## Ordered release procedure — execute only after approval

1. **Record and back up.** Keep checkout false. Record approved commit, current Vercel deployment and environment targets. Owner obtains a timestamped Supabase backup covering data/schema and a storage/object inventory; record backup ID, size and retention. Rehearse restoration only in a separately authorized disposable project, never over production. Record a working recovery path before DDL.
2. **Reconcile migration baseline.** Read catalog definitions, policies, grants and function signatures against 005–014. Check integer-cent conventions, order status constraints, UUID/auth dependencies, and absence of duplicate non-null PaymentIntents. Recheck zero pre-existing user-assigned admins. Compare the upgrade to canonical SECTION 015. The hosted database already has commerce tables: **do not replay the full canonical bundle**. Stop on drift.
3. **Rehearse 015 in staging.** Apply only `migrations/015_commerce_payment_recovery.sql` on the approved staging baseline. Test separate concurrent database connections, paid-vs-refund races, stale receipt replay and denied anon/authenticated execution. Verify RLS on holds/outbox/receipts/jobs and profile INSERT/UPDATE privilege guard under real PostgREST roles. Keep evidence, including expected failures.
4. **Approve hosted migration.** After backup/rehearsal sign-off, owner separately authorizes applying 015. Verify holds table, unique PaymentIntent index, triggers, four new service-role RPCs, replacement signatures and grants. Do not enable checkout. Additive migration is retained on application rollback; do not drop financial evidence.
5. **Validate configuration/accounts.** Owner verifies actual secret-key mode/account without exposing values. Preview must use Stripe TEST with matching webhook secret; production remains live-mode configured but checkout false. Require canonical Supabase URL/service role, correct Printify shop/token, webhook secrets, Resend verified sender/support address, operations secret and server-owned ADMIN_EMAILS. For the existing admin UI, provision its profile admin marker through a trusted service-role workflow as well; that marker is no longer sufficient for API authorization. The orders UI sends the signed-in bearer token, never the operations secret. Confirm Printify requires manual production release. Run preflight; additionally prove connectivity and ownership.
6. **Authorize isolated preview release.** This PR branch disables automatic Vercel deployment via `vercel.json`. A preview requires separate approval and a deliberate deployment/branch-policy change. Deploy only with test Stripe and approved mocked/dry-run Printify; both checkout/persistence flags may be enabled in that isolated environment after approval. Do not copy production live keys into it.
7. **Stripe proof.** Configure a test endpoint with checkout completed/async succeeded/async failed/expired, `charge.refunded`, `refund.created`, `refund.updated`, `refund.failed`, and dispute created/updated/closed/funds-withdrawn/funds-reinstated events. Pin/validate API version. Owner verifies Stripe Tax registrations/product classification, public merchant details and actual provider shipping rates. Run one authorized test-card checkout, a delayed method and one shipping+tax case. Capture session, event, PaymentIntent and order IDs, exact cents, one job and one outbox row. Redeliver/reorder events and prove no duplicate orders. No live test charge.
8. **Email proof.** Confirm verified sender DNS and recipient delivery, not just provider acceptance. Force an email failure, observe pending/failed count, recover with the authenticated notification endpoint and prove attempts increase without duplicating sent messages. Verify persisted order number, purchased items and amounts. Reconcile uncertain delivery before retrying.
9. **Manual fulfillment proof.** Validate every artwork snapshot and shipping/economics audit with the dry-run endpoint. Under separately approved provider-write scope, create exactly one draft, compare external_id/items/address/costs, and confirm no production submission. Repeat preparation to prove deduplication. Simulate outage and unknown acknowledgement; reconcile by external_id before changing any stuck/uncertain job. Physical sample/production release requires additional owner approval.
10. **Refund/dispute proof and ownership.** In TEST mode, refund before and after draft creation; verify cumulative amount, hold, cancelled local job and denied approve. Exercise dispute-before-payment and stale paid-event replay. Owner verifies external draft/production cancellation separately; local cancellation does not prove provider cancellation. Assign dispute evidence/deadline monitoring and refund customer communication. Never auto-release failed-refund or won-dispute holds; preserve signed receipts and require reviewed reconciliation.
11. **Authorize production code release with checkout still false.** Require green CI, completed staging/account/email/provider proofs, reviewed migration evidence, explicit merge/deploy approval and staffed monitoring. Merge/deploy only then. Verify the deployed signed webhook can still record matching-mode events while checkout is off. Register the complete live event set with the matching secret/API version before activation, under separate settings approval.
12. **Activation approval.** Owner explicitly approves live selling only after all preceding gates are green. Verify production live key, live-release approval flag, checkout/persistence flags and manual draft mode. Apply the approved activation change; this PR does not do it. Observe the first genuine customer orders with the assigned operator. No synthetic live charges are required by this procedure.
13. **Monitor.** Check the authenticated operations counts and receipt/job/outbox queues at least every five minutes during the staffed launch window. Escalate any failed paid receipt, stale processing >5 minutes, uncertain provider submission, unsent email >15 minutes, or unreviewed financial hold. Reconcile Stripe successful payments against local orders and Printify drafts; the monitoring endpoint cannot detect a Stripe payment whose webhook never arrived. Route real alerts before unattended sales.
14. **Rollback.** On a paid-order mismatch/duplicate/unauthorized transition, owner disables **new checkout only**, preserves persistence and webhook/key-mode configuration, and pauses manual provider release. Reconcile Stripe payments/held orders/outbox and provider external IDs. Roll back application only to a compatible reviewed build retaining 015 protections; never roll back to the known vulnerable framework/admin authorization. Do not restore production, delete receipts, clear holds or resend ambiguous provider requests as a shortcut. Communicate with affected customers and resume only after explicit approval and reproduced recovery proof.

## GO / NO-GO matrix

| Gate | Decision now | Required proof before a real customer pays |
|---|---|---|
| Local engineering / synthetic recovery | GO for review | Final PR tests and reviewer sign-off; no production activation implied. |
| Database/security release | NO-GO | Backup + real staging concurrency/PostgREST proof + approved 015 application and code release. |
| Stripe amount/account/tax/webhooks | NO-GO | Actual TEST checkout, correct merchant/account/tax/shipping and complete subscriptions/version. |
| Fulfillment and financial operations | NO-GO | Approved draft/sample, cancellation/refund/dispute drill and named operator. |
| Transaction emails / monitoring | NO-GO | Configuration, recipient delivery, retry/alert proof and staffed launch window. |
| Production activation | **NO-GO** | All above + explicit owner approval. Checkout remains false. |

References: [Stripe event types](https://docs.stripe.com/api/events/types), [Next.js security advisory](https://github.com/advisories/GHSA-2464-fhr4-w9xw), [Vercel branch deployment control](https://vercel.com/docs/project-configuration/git-configuration#git.deploymentenabled).
