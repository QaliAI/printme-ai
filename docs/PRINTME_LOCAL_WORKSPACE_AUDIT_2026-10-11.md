# PrintMe local workspace audit — 2026-10-11

Read-only directory discovery: `C:\Users\omino\Documents`, names matching `printme*`, `*printme*`, or `business-os*`. Only the canonical checkout was modified. No checkout, branch, clone, project, or worktree was created.

| Folder | Classification | Remote | Branch | HEAD | State / relationship |
| --- | --- | --- | --- | --- | --- |
| `C:\Users\omino\Documents\printme-ai-live` | CANONICAL | `https://github.com/QaliAI/printme-ai.git` | `feat/printme-revenue-activation-2026-10-11` | `83da8ee0707275e2ec523227a58be3b0bc5945a3` at start | Independent primary checkout; sole worktree. Initially only pre-existing untracked investigation files. Repair performed here. |
| `C:\Users\omino\Documents\printme-ai-business-os` | STALE WORKTREE relative to this sprint base | `https://github.com/QaliAI/printme-ai.git` | `ops/printme-business-os-2026-09-23` | `3e3b59daf04a43194f71d9349d3684d2f15acf10` | Linked to `C:\Users\omino\printme-ai` (master `7c22d68`). Contains active uncommitted work; “stale” does not mean safe to delete. Left untouched. |
| `C:\Users\omino\Documents\printme-trends-dashboard` | SEPARATE PROJECT | `https://github.com/QaliAI/printme-trends-dashboard.git` | `feature/trend-radar-foundation` | `6d583b8d988fb0648d91b47734ad8c8c1ee61a53` | Independent primary checkout; sole worktree; `.gitignore` modified. Left untouched. |

Business OS modifications observed: `app/studio/designs/StudioDesignEditor.tsx`, `lib/commerce/designs/service.ts`, `lib/quality/supabase-store.ts`, `lib/studio/client.ts`, `package.json`, `package-lock.json`, `tests/commerce/designs.test.ts`; untracked `app/api/studio/quality/`, `lib/quality/reviewer-workflow.ts`, `tests/quality/reviewer-workflow.test.ts`.

Preserved pre-existing canonical untracked files: `audit/live-investigation/`, `scripts/audit-live-site.mjs`, `scripts/test-live-create-flow.mjs`, `scripts/test-live-mug-preview.mjs`. They are excluded from this repair commit.

An unrelated local app occupied port 3000 during verification. Its processes and files were left untouched; this checkout’s Playwright server now uses configurable port 3100. Next.js root is explicitly this checkout to avoid parent lockfile inference.
