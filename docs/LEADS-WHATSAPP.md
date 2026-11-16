# Leads → WhatsApp preparation

Prepared on 16 November 2026. **Disabled by default. No end-to-end WhatsApp conversation has been verified.** WhatsApp account setup is pending, as confirmed by the owner.

## Implemented

- Contact, project inquiry and booking APIs accept optional `whatsapp_consent: true`. False or omitted keeps existing behavior. Consent requires an international phone number with an explicit country code; a project-information confirmation is never treated as WhatsApp consent.
- On opt-in, the lead and its conversation queue row commit in the same MySQL transaction. The server supplies the consent timestamp and version `whatsapp-followup-v1`. Exact text: “I agree to receive WhatsApp messages from Shiv Patel about this inquiry and arranging a call. Optional. Reply STOP to opt out.” Existing submissions are never opted in retroactively.
- Website consent checkboxes and CRM conversation controls are hidden until `NEXT_PUBLIC_LEADS_ENABLED=1` and a rebuild. The migration must run first. No keys belong in public environment variables.
- Dispatch claims each queued row atomically, calls an allowlisted HTTPS n8n production webhook with an independent header credential, and sends only the conversation ID. No redirect following. A timeout, server error or crashed worker becomes `uncertain`; automatic replay is prohibited because n8n may already have accepted the event. Reconcile with execution history manually.
- The CRM shows up to 100 recent conversation states, requested call instants and zones, Take over, and Stop WhatsApp. Stopped records cannot be reactivated by a callback. Deleting a lead also deletes its conversation while the integration is enabled. Workers cannot fetch deleted leads.
- Version checks and database row locks reject stale callback writes. Call preferences require a future ISO instant with an explicit UTC offset and a valid IANA time zone. They remain `appointment_requested`; the integration does not claim a slot is reserved or send a confirmation.

## Account-dependent work still required

1. Configure the intended WhatsApp Business account, sender phone-number ID, server-side access token and permissions. Use a dedicated n8n WhatsApp credential. No usable WhatsApp credential was found in the connected n8n instance.
2. Submit and obtain approval for the actual initial follow-up and any required appointment confirmation templates. Example initial copy for review: “Hi {{1}}, this is Shiv Patel following up on your website inquiry. What date, time and time zone would suit a call? Reply STOP to stop WhatsApp messages.” This is proposed copy, **not an approved template**. Verify current Meta policy and template classification during setup.
3. Build the inbound WhatsApp webhook with Meta verification and signature validation before parsing its payload. Deduplicate incoming and outgoing message IDs durably, including duplicate webhook deliveries and ambiguous send results. Check consent and takeover immediately before each message. Apply opt-out across open conversations for the same number; this preparation only stores opt-out per conversation and has no inbound message receiver yet.
4. Configure the conversation agent to identify itself as automated, discuss only the inquiry, ask date, time and time zone, clarify ambiguous answers, and read back the full proposed instant. A preference is not a booking. Check availability through the existing booking mutex and conflict checks before reserving a slot and sending a confirmation. Do not let an AI-generated timestamp or claim of availability bypass those checks. Escalate requests for a person, uncertainty, failures, unrelated requests and exhausted attempts to human takeover. Do not contact leads who did not opt in.
5. Persist WhatsApp send/delivery/read/failure receipts and conversation messages with a retention policy before enabling the sender. Current states describe integration progress, **not WhatsApp delivery receipts**.

The saved n8n preparation canvas is at https://n8n.shivpatel.in/workflow/N6Y34QiqtTcCM6kQ. It stays unpublished. Its manual preview outputs `account_setup_pending` and `sent:false`. The builder automatically selected an unrelated existing credential when creating a webhook; that webhook was removed, so no unrelated credential remains attached. Add a new authenticated webhook only after creating the correct independent credential. The canvas is a preparation aid, not a runnable conversation flow.

## Installation and endpoint contract

1. Run `node --env-file=<private-env-file> scripts/migrate-lead-conversations.mjs` against the intended database after reviewing `scripts/007-lead-conversations.sql`. It only creates the new table; it does not modify existing leads. Fresh database setup includes the table too. This migration has not been run against production.
2. Generate independent random secrets of at least 32 characters for `LEADS_N8N_WEBHOOK_KEY`, `LEADS_DISPATCH_KEY` and `LEADS_CALLBACK_KEY`. Set the new n8n Webhook node's Header Auth name to `X-Leads-Key` and value to the matching webhook key. Never reuse a publishing, account or existing workflow credential. Configure `LEADS_N8N_WEBHOOK_URL` only after the real intake is ready; it must be under `https://n8n.shivpatel.in/webhook/`.
3. Only after account setup, inbound validation, deduplication and acceptance checks are complete, enable `NEXT_PUBLIC_LEADS_ENABLED=1` and rebuild. A public opt-in that cannot yet be fulfilled should remain hidden.
4. Configure the existing scheduler to POST `/api/jobs/leads` with `Authorization: Bearer <LEADS_DISPATCH_KEY>`. It dispatches up to five queued events per call. No scheduler was enabled by this change. Events contain `{conversation_id,source:"website-lead"}` and the stable `Idempotency-Key` is the conversation UUID. An unconfigured webhook leaves the queue untouched.
5. n8n GETs `/api/jobs/leads/<conversation_id>` with `Authorization: Bearer <LEADS_CALLBACK_KEY>`. The response includes normalized phone, original lead name/message, consent version/time, state, integer version and `can_message`. It returns 404 for a deleted source lead. Never cache the response. Dispatch acknowledgement may briefly be pending: wait until state is accepted before starting the conversation; never send while `can_message` is false.
6. PATCH the same URL using the callback credential and JSON, for example:

   ```json
   {"version":3,"state":"appointment_requested","preferred_call_at":"2027-01-20T15:00:00+05:30","timezone":"Asia/Kolkata"}
   ```

   Valid callback states: collecting, appointment_requested, human_takeover, opted_out, error. The server returns the next version. A stale update receives 409: re-read the current state and honor takeover/opt-out. Original lead answers and booking confirmation status are never rewritten here. This callback is for authenticated n8n; it is not the public Meta webhook.
7. Owner controls use the existing authenticated, same-origin, writable dashboard session through GET/PATCH `/api/admin/lead-conversations`. PATCH accepts `{id,version,state}` with human_takeover or opted_out. On an uncertain dispatch, inspect n8n history before any manual database reconciliation; there is deliberately no one-click retry or resume that could send duplicate messages.

## Acceptance before activation

- Migrate and verify consented contact, project inquiry and booking persistence; no-consent submissions produce no queue row. Test failure rollback and duplicate submissions.
- Verify missing/wrong credentials are rejected at both ends; allowlisted target restrictions and redirection refusal; ensure secrets and private lead data never appear in public responses or execution logs.
- Run scheduler through the real authenticated webhook with a synthetic lead. Test concurrent dispatchers, n8n outage and lost acknowledgements. Verify uncertain events never resend automatically.
- With a consenting test number, demonstrate template → reply → date/time/zone clarification → preference readback → availability reservation → confirmation. Record execution and message IDs and delivery receipts.
- Demonstrate STOP and human takeover stopping subsequent messages; duplicate and out-of-order inbound events; invalid signature; unavailable slot; failed send; time-zone ambiguity; repeated confirmation; restart recovery.
- Inspect desktop and mobile consent/CRM controls with the feature enabled. Review retention/deletion behavior for phone numbers, consent and communication history.

Reference: [Meta WhatsApp Business Platform](https://developers.facebook.com/documentation/business-messaging/whatsapp/overview), [n8n webhook documentation](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/).
