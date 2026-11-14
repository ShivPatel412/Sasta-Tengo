# Tasks, lead CRM and n8n controls

Both the website dashboard and native iOS app use the same authenticated website APIs. Existing portfolio projects remain separate from client project/task management; tasks are grouped with a free-text project name.

## Included

- `/dashboard/tasks`: create and edit tasks with a project name, description, priority and optional due date. Move cards through To do, In progress, Review and Done using drag and drop or the keyboard-accessible stage selector.
- `/dashboard/crm`: both contact-form and service-inquiry/booking leads in New, Contacted, Qualified and Closed columns. Open a card to edit internal notes, lead stage, contact read state or inquiry status. Original form answers are never rewritten.
- `/dashboard/workflows`: synchronize the collector's full workflow list; execution is enabled only for explicitly connected authenticated production webhooks. Recent request acknowledgements are separate from actual n8n execution results.
- iPhone tabs: Overview, Lead CRM, Tasks, Workflows and Portfolio. Projects and Experience remain available under Portfolio. Workflows → Manage visible workflows lets the owner hide or show workflows on that iPhone. New workflows are visible by default; only hidden workflow IDs are stored in local preferences.

## Additive database setup

`scripts/006-workspace-management.sql` creates `next_workspace_tasks` and `next_workflow_runs`. No existing table, form submission, project, account or n8n record is changed. Task queries use the signed-in owner ID. Updates check a numeric version so concurrent edits fail with HTTP 409 rather than silently overwriting newer work.

In a private staging environment with database setup privileges:

```sh
node --env-file=.env.local scripts/migrate-workspace-management.mjs
```

When credentials are stored as unreadable Vercel Secrets, set the server-only Config variable `WORKSPACE_ALLOW_MIGRATION=1` for the intended deployment environment and deploy this reviewed commit. The existing build command runs the additive migration before `next build`, using Vercel's own environment. A migration failure fails the build. Remove this flag after the first successful deployment. Fresh database setup includes these tables automatically.

Runtime access needs SELECT/INSERT/UPDATE on the two new tables. The one-time setup needs CREATE privilege. Existing session authentication, exact-origin checks, parameterized SQL and `MIGRATION_READ_ONLY` apply to every new mutation. No browser or app receives DB credentials or n8n secrets.

## Connect n8n execution

Monitoring metadata alone cannot execute workflows. For each workflow that should have a Run button:

1. Add a POST Webhook trigger to the appropriate starting point in n8n, preserving existing triggers. Workflows requiring input files or other interactive payloads need a suitable input/preparation path before they can use this empty-input launcher.
2. Set the Webhook node's authentication to Header Auth using `X-Workspace-Key` and a new independent secret of at least 32 characters. Keep the credential inside n8n.
3. Set response mode to Immediately. Publish the workflow and copy its production `/webhook/…` URL; `/webhook-test/…` is not supported. See [n8n Webhook documentation](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/).
4. In Vercel, set server-only Secret `WORKSPACE_N8N_WORKFLOWS` to a JSON array with one entry per connected workflow:

```json
[
  {
    "id": "existing-n8n-workflow-id",
    "name": "Workflow display name",
    "url": "https://n8n.shivpatel.in/webhook/your-production-path",
    "key": "replace-with-an-independent-random-secret"
  }
]
```

Use the actual n8n workflow ID so it matches the synced collector list. The example is a shape, not a working credential. Configure values privately; never commit this JSON with real keys. Redeploy after updating the secret.

Targets are restricted to HTTPS `n8n.shivpatel.in/webhook/…`; credentials in URLs, query strings, custom ports and redirects are rejected. The server sends `{requestId, source:"shiv-dashboard"}` and the matching `Idempotency-Key` header. The website stores the request ID before dispatch and never dispatches that same ID twice. Pass it through n8n for downstream deduplication where applicable.

Accepted means n8n acknowledged the trigger, not that its actions completed. A timeout, server failure or interrupted dispatch is uncertain: inspect n8n before initiating another request. The UI's Check last request option repeats the same ID safely. Do not treat stale collector metadata as proof an execution succeeded. Workflows without a configured webhook remain visible with execution disabled.

## Validation and limits

Run `pnpm test`, `pnpm build`, and the Swift contract checks in `ios/README.md`. The new tests cover validation, task ownership and concurrent edits, lead-source aggregation and safe stage changes, webhook destination restrictions, secret redaction, execution deduplication and uncertain acknowledgements. No test triggers a real n8n workflow.

For isolated UI verification, run the production build on `127.0.0.1:3014`, then:

```sh
WORKSPACE_PREVIEW_NEXT_PORT=3014 node tests/workspace-preview.mjs
```

Browse `http://127.0.0.1:3013/dashboard/tasks`. This loopback-only proxy serves explicitly synthetic in-memory API responses; it has no database connection, does not authenticate with production and never contacts n8n. Changes disappear on restart. It verifies the UI contract, not actual MySQL behavior or live integration.

Boards paginate 100 cards at a time, with Load more and visible loaded/total counts. Column counts refer to loaded cards. Task deletion, automatic workflow completion callbacks, editing original lead submissions and configuring n8n credentials from the phone are outside this change.

Rollback the code to hide these features. The new tables can remain without affecting the old dashboard; rollback does not require deleting any task or execution history.
