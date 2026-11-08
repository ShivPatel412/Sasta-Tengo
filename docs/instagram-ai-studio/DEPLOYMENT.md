# Deployment readiness

Work is isolated on `feature/instagram-ai-studio`. Do not merge, push production,
change production secrets, run production migrations, install/activate the new
n8n workflow or publish Instagram posts without the owner's separate approval.
The live dashboard and read-only n8n monitoring are unchanged by this branch.

Before approval, review the feature diff, audit and test results. Then prepare:

1. A dedicated private Blob store and secret; verify signed-out media rejection.
2. The additive Studio migration on the intended production database after backup.
3. Separate Studio webhook/callback/recovery keys and canonical APP_ORIGIN.
4. Inactive n8n import, existing Gemini credential selection, and a synthetic
   vision-generation test including real callback delivery. Approve activation
   only after this passes. Do not rerun existing photo posting workflows.
5. Optional Google app credentials/consent. Personal cloud remains disabled.
6. A scheduler for durable offline recovery and dry-run-first retention cleanup.
7. Authenticated desktop/mobile acceptance using the real production session,
   existing website editors and status monitoring.

Vercel requests stay below the default 4.5 MB request ceiling by uploading one
photo per request, not one multipart batch. AI execution is asynchronous on n8n.
Image ZIP assembly happens in the authenticated browser to avoid serverless
response-size limits. Storage and AI usage can incur charges; no new paid
service was provisioned automatically.

Rollback removes/disables the Studio navigation/module and webhook, leaving
existing portfolio, monitoring and records intact. Do not drop tables or delete
private photo copies as part of a normal rollback.
