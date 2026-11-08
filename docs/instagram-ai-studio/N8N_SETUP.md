# n8n execution setup

No existing workflow, credential or collector was changed. The workflow is
prepared but not installed or activated:

- JSON: `control-room/instagram-studio/workflow.json`
- Generator: `control-room/instagram-studio/build_workflow.py`
- Name: Shiv Instagram AI Studio | private analysis
- Production webhook path: `/webhook/shiv-instagram-studio`

After approval, import the JSON in n8n. Assign a NEW HTTP Header Auth credential:
header `Authorization`, value `Bearer ` followed by `STUDIO_N8N_WEBHOOK_KEY`.
The key must be independent of collector, existing photo and project tokens.
Select the existing Google Gemini/PaLM credential on the Gemini HTTP node;
the export contains only a credential reference, never its API key. Confirm
the selected model supports image input and JSON output. The prepared model
is `gemini-3.1-flash-lite`, already used by the existing project integration.
Quota and actual vision generation still require testing after authorization.

Set the three independent server secrets described in ENVIRONMENT.md and the
webhook URL. Activate the workflow only after separate approval. n8n acknowledges
the authenticated POST immediately, analyzes the supplied JPEG previews,
then POSTs a result to the fixed canonical website callback URL. It validates
the callback origin, UUIDs and input bounds before any provider request.

Request fields: job_id, attempt, photos[{id,inline_data}], theme,
confirmed_location, max_photos, weights, callback_url, callback_token.
Result contract: see `analysisSchema` in `lib/instagram-core.mjs`. Every photo
must appear once, metrics are 0–100, captions exactly three, order a unique
subset, and hashtags must be valid. Invalid results cannot change a draft.
AI recommendations cannot make posting decisions.

Per-job callback token = HMAC-SHA256(STUDIO_CALLBACK_KEY, job_id + ':' + attempt).
The workflow receives only this scoped token, not the global callback secret.
Example callback body (symbolic values):

```json
{"job_id":"UUID","attempt":1,"result":{"photos":[],"order":[],"captions":["short","casual","story"],"hashtags":[],"music":[]}}
```

The example is a shape illustration; empty photo analysis is rejected. Provider
failure callbacks use `{job_id, attempt, error:true}` with the same scoped
Authorization header. A repeated accepted callback returns unchanged. Old
attempts, expired jobs and cancelled jobs cannot apply results.

Offline: jobs remain visible and retryable. `POST /api/jobs/instagram/recover`
with `Authorization: Bearer STUDIO_DISPATCH_KEY` and `{}` dispatches one eligible
pending/waiting job per call. Configure a scheduler after approval, or use the
dashboard Retry button. Timed-out processing jobs require explicit retry. The
recovery credential cannot authenticate a browser or publish a post.

The import is inactive; its test webhook is not claimed to work. For local
integration testing use the synthetic test harness, not a production workflow.
Never paste real previews or callback tokens into saved n8n pin data. Execution
success/error/manual saving is disabled in the prepared JSON.
