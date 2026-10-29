# Validation and launch gate

## Local evidence

See `VERIFICATION.md` for the checks actually run. A successful build and unit tests do not establish real-data parity. The tests below require a restored staging database and media. No production launch is accepted until the owner reviews those results.

## Staging checklist

- [ ] Restore the original database and public uploads privately. Compare table counts, last IDs, digests, types/indexes, foreign keys and media byte hashes. Audit old/new copies with the same tool and snapshot boundary.
- [ ] Apply additive support tables to staging; test TLS and least-privilege runtime credentials from the deployed function region. Confirm transaction support and booking mutex row.
- [ ] Verify the legacy bcrypt administrator can log in only when the account email matches ADMIN_EMAIL. Reject wrong passwords and valid nonadmin users. Test throttling across multiple function instances, session expiry, logout/revocation and cross-origin mutations.
- [ ] Check service/education/experience/project list/detail endpoints, category and featured filters, boolean/JSON types, sorting, poster_url and gallery_urls against actual Laravel responses.
- [ ] Check every supplied visual on desktop and mobile. Confirm missing `/cv.pdf` is restored with the correct public CV. Verify WebGL/animation support and all links. Verify Next.js navigation between home, booking and dashboard and direct loading of each route.
- [ ] Confirm read-only mode refuses all public and dashboard data changes and uploads; no false success acknowledgement. Session/rate support tables may still change for authentication.
- [ ] Enable staging writes. Submit contact with optional phone; validate required fields and maximum lengths, rate limits, SQL injection strings, escaped script-like text, duplicate rapid submission and DB persistence. Confirm admin_notes/read state/lead stage survive edits and logout/login.
- [ ] Submit every project-request wizard variation (other service, arrays, URLs, all budget/timeline/contact answers). Compare the complete request_data JSON and notes in the dashboard. Invalid consent/URLs/overlong input must fail.
- [ ] Book a future appointment for a valid service, including concurrent requests for the same time across different services. Only one active booking should persist. Verify old date/time interpretation and new UTC writes.
- [ ] Add/edit a project with technologies, custom category, order and featured flag. Verify existing poster/gallery survive a text-only edit. Upload supported images under 4 MB; reject SVG, disguised input, huge files and unauthenticated requests. Verify new Blob URLs and old relative media paths together.
- [ ] Add/rename a project type; confirm renaming keeps the category key stable and deletion of in-use types is refused. Verify new type/category immediately appears in project management.
- [ ] Add/edit experience with dates, current role, logo, highlights, technologies and order. End date before start date must fail unless current role clears it. Confirm public rendering.
- [ ] Verify pagination, search and counts using more than 20 records per dashboard collection. Test direct record URLs, editing, deletion confirmation and database outage behavior. Check no private lead fields appear in public API responses or HTML.
- [ ] With explicit test-recipient approval, verify SMTP owner and submitter notifications, retry after failure, outbox checkpoints, scheduler authorization and unsent-job monitoring. No secret or customer payload should enter logs.
- [ ] Run a final restore/rollback rehearsal, then capture a final immutable backup at write freeze. Keep old system read-only during DNS propagation.
- [ ] Approve the exact Git commit, production environment/resources, and before/after DNS record table. Verify production only after that approval.

## Known differences needing owner acceptance

The public frontend is editable Next.js client components; no separate router or compiled application loader remains. The new dashboard preserves core management functions/data, with a different layout and simplified overview, explicit read-state saving instead of marking contacts read on GET, and safe retention of old media. Upload limit is 4 MB. Plain-text mail replaces Laravel templates. There is no payment integration (the supplied application removed payments). Session tokens from Laravel are deliberately not portable.
