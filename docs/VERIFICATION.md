# Next.js-only validation — 29 October 2026

The application now lives at the repository root on branch `codex/nextjs-only`. Public components were ported from the editable frontend source found in GitHub. Next.js App Router owns home, booking, dashboard and API routing. The compiled application bridge, standalone React app, Laravel source, Apache settings, old build scripts and archive were removed from this branch. Git history retains the earlier code.

The root application passes all 22 automated tests and production build without database credentials. Local browser checks cover homepage, booking navigation, form validation, the interactive map and dashboard login page. These checks do not verify restored records, password login, mail or uploads.

Database and uploaded project media were absent from the supplied archive. They must be restored to a private staging environment, reconciled with the source and tested before production cutover. The CV remains missing. No production promotion or DNS change is authorized yet.

## Live dashboard activation — 30 October 2026

The owner subsequently authorized enabling live editing and form submissions. Production was redeployed with `MIGRATION_READ_ONLY=0`; the branch-specific Preview setting remains in review mode. Live authenticated session checks confirmed editing enabled. Project, experience, contact and service-application endpoints passed the write guard and rejected empty submissions with validation errors (422), without creating test records. No DNS was changed.

The redesigned dashboard passed 30 automated tests, a production build, and local database/browser checks covering content saves and inquiry follow-up. Production image uploads remain unavailable until image storage is approved and connected; hosted image URLs are supported. SMTP delivery has not been verified. Credentials and private configuration remain excluded from Git.

## Typography, saved colors and dashboard loading — 4 November 2026

Dashboard appearance now includes allowlisted font families, normal text sizes from 12–20 px and heading sizes from 24–44 px. The idempotent appearance migration adds those fields without replacing existing colors or website records. Color-only requests from older dashboard tabs preserve saved typography.

A persistent dashboard layout shares the authenticated session and appearance across tabs. Only validated, non-sensitive appearance values are stored in browser storage for early rendering; portfolio and inquiry records are not cached there. Every backend request still authenticates, and writes retain origin checks, validation and write controls. Concurrent identical reads share only the in-flight request and are discarded after completion or mutation. Overview aggregates and recent data are loaded concurrently; list rows and pagination totals are also read concurrently. Repeated blur passes and duplicate request/storage code were removed.

Local browser checks verified that custom colors and fonts persist through navigation and reload; the largest supported sizes fit a 390 px viewport without page overflow. The final test palette was restored. On three local read-only samples against the configured database, the overview API median changed from 298 ms to 164 ms and project-list median from 106 ms to 78 ms. These are endpoint measurements, not a public PageSpeed score or a guaranteed user-device speedup.
