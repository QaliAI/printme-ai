# Prior work reconciliation — 2026-10-22

Repository: QaliAI/printme-ai. Starting master: `2ce378c6093b5e5a9e1aaa0fab18aa2954bdd429`. User explicitly authorized verified merges and the public Pets deployment, while prohibiting production migrations/payment activation/provider orders.

| Work | Verified disposition |
|---|---|
| PRs 24, 27, 28 | Already merged in starting master. Existing totals/payment-mode/RPC/Linux fixes retained. |
| PR 25, commit `a83c026` | Ancestor of master via PR 27; no omitted implementation. |
| PR 9 | All three text-thread designer files already on master through `d67f75d`; remaining unique changes restore an unused variable/remove newer gates. Preserve current implementation. |
| PR 29 | Final head `afabe3ef7d8971027e2121b06081bf81cd2956c1`, both CI jobs green, independently reviewed for hosted 014 compatibility. Merged as `ff5a39a884f7660207a3983f47df7659809c0427`. Checkout remains false. |
| Other remote branches | Reviewed as merged or patch-equivalent; no separate missing change to merge. |
| `fix/checkout-release-blockers` / `98bc935` | Historical release review; code superseded by 27/29. Retained. |
| `release/revenue-launch-sprint` / `d80edae` | Contains conflicting old RPC contracts and tracked output. Retained, not merged wholesale. Useful absent `lib/quality/{controller,reviewer-workflow,studio-approval,supabase-store}.ts` plus two APIs/tests require a separate migration/security review. |
| `release/showcase-rescue` / `612c42a` | Stale storefront/customizer/webhook work superseded or incompatible. Retained. |
| `sprint/mobile-preview-shareable-designs` | Five June legacy generation changes superseded by October generation work. Retained. |
| `.claude/worktrees/ecstatic-lichterman-544779` | Clean detached worktree at `9004fe5`; left untouched. |
| Pre-existing `.freebuff/`, `brand/printmerobot/` | Untracked unrelated work preserved and excluded from commits. |

No branch was deleted, no stale release branch was merged blindly, and no functioning homepage, product editor, Unit 001 robot or existing commerce flow was replaced.

Production database caveat: API admin authorization is independently protected, but existing database SELECT policies trust `profiles.is_admin` until the approved 015 profile guard is installed. The hosted catalog also retains the nine known public-write exposures until approved 016. Code deployment does not fix unapplied database policy changes. Both remain paid-launch blockers, documented in the commerce release evidence.
