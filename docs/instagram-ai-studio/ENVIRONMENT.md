# Environment and privacy

No production secrets were changed. Local test secrets were generated only in
ignored `.env.master.local`. All secret values below are symbolic descriptions.

| Variable | Purpose |
| --- | --- |
| Existing DB/auth/origin variables | Reuse website connection, administrator, sessions, write guard and exact mutation origin |
| STUDIO_BLOB_READ_WRITE_TOKEN | Dedicated PRIVATE Vercel Blob store token, server-only; absent in current environment |
| STUDIO_UPLOAD_BYTES | Optional per-file limit, bounded 100 KB–4 MB, default 4 MB |
| STUDIO_N8N_WEBHOOK_URL | Approved HTTPS n8n.shivpatel.in webhook only |
| STUDIO_N8N_WEBHOOK_KEY | Independent webhook Header Auth key, at least 32 characters |
| STUDIO_CALLBACK_KEY | At least 32 characters; derives per-job/per-attempt callback signatures |
| STUDIO_DISPATCH_KEY | Separate at-least-32-character key for durable recovery endpoint |
| NEXT_PUBLIC_STUDIO_GOOGLE_CLIENT_ID | Public Google OAuth web client identifier |
| NEXT_PUBLIC_STUDIO_GOOGLE_PICKER_KEY | Referrer/API-restricted public Picker key |
| NEXT_PUBLIC_STUDIO_GOOGLE_APP_ID | Public Google Cloud project number |
| STUDIO_ALLOW_MIGRATION | Explicit one-time migration guard, value 1 only after checking target |

Never reuse `CONTROL_ROOM_PUSH_KEY`, administrator password, photo worker token,
or project ingestion key for Studio execution. Never prefix a secret with
NEXT_PUBLIC_. Secrets belong in private server settings, not source or chat.

Storage: explicit local-master development writes `.local/instagram-media/`.
Production requires a private Blob store. The existing public project upload
route is not reused for personal photos. Originals remain on the source device;
the Studio stores metadata-free normalized copies. Names are retained privately
for the owner's library but are not sent to Gemini. AI preview processing is
initiated by the user. Do not send private photos to an unapproved provider.

The optional recovery URL and cleanup command are not scheduled automatically.
Publishing is always disabled; there are no Meta publishing credentials in this
feature. Phone uploads use the same authenticated browser session; there is no
public anonymous upload endpoint. Optional QR upload was omitted to avoid a
second access path when standard mobile gallery selection already works.
