# Instagram Studio connection

The website's private Instagram Studio uses the existing five-node analysis bridge,
`ShivInstagramStudio01`, at `/webhook/shiv-instagram-studio`. It runs only when an
authenticated website user explicitly requests analysis. It does not publish posts
or access Meta accounts. It reuses the existing Gemini credential and the
`gemini-3.1-flash-lite` model, verified through a read-only model lookup.

`install.py` creates an inactive workflow in the existing personal n8n project and
refuses to overwrite one already installed. Its dedicated execution credential is
generated on the host under `/var/lib/shiv-instagram-studio/config.json` (root-only).
Set the matching production `STUDIO_N8N_WEBHOOK_KEY`, `STUDIO_CALLBACK_KEY`, and
`STUDIO_DISPATCH_KEY` through Vercel's private environment settings. Set
`STUDIO_N8N_WEBHOOK_URL=https://n8n.shivpatel.in/webhook/shiv-instagram-studio`.
Never commit these values. Publish the workflow only after testing it.

Private image storage uses `STUDIO_BLOB_STORE_ID` with the project's short-lived
Vercel OIDC credentials, or a dedicated `STUDIO_BLOB_READ_WRITE_TOKEN`. It does not
inherit the public project-gallery store. The private store created for this setup
is `store_AF5YQzrhr0sYloGX` in Mumbai. Storage and transfer remain subject to the
existing Vercel plan's allowances and billing.

For the first production deployment, explicitly pass the build-only flag
`STUDIO_ALLOW_MIGRATION=1`. The existing additive SQL migration runs before the
build; ordinary later builds skip it. Existing photo, draft and project rows are
not modified by the migration.

The workflow disables success/error execution-data storage and manual execution
storage. Provider failures and incomplete responses return an error callback;
model reasoning text is excluded. The callback validates batch ownership, attempt,
expiry and the full result schema before changing a draft. A repeated callback is
idempotent. Music remains suggestions for manual posting, not attached audio.

Verified locally: 76 website tests, production build, and an n8n pinned execution
using synthetic photo/result data. This does not establish live AI quality,
private-photo consent, Google Drive/Nextcloud import, or Meta publishing access.
