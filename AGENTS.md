<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project workflow

After completing and verifying a task, commit and push the relevant code changes directly to `main`, as requested by the project owner. This is the default publishing workflow and triggers the live Vercel deployment; a separate pull request approval is not required. Integrate remote changes without force-pushing. Never commit credentials, private configuration, or customer data. Live DNS changes still require separate authorization.
