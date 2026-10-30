# Next.js-only validation — 29 October 2026

The application now lives at the repository root on branch `codex/nextjs-only`. Public components were ported from the editable frontend source found in GitHub. Next.js App Router owns home, booking, dashboard and API routing. The compiled application bridge, standalone React app, Laravel source, Apache settings, old build scripts and archive were removed from this branch. Git history retains the earlier code.

The root application passes all 22 automated tests and production build without database credentials. Local browser checks cover homepage, booking navigation, form validation, the interactive map and dashboard login page. These checks do not verify restored records, password login, mail or uploads.

Database and uploaded project media were absent from the supplied archive. They must be restored to a private staging environment, reconciled with the source and tested before production cutover. The CV remains missing. No production promotion or DNS change is authorized yet.

## Live dashboard activation — 30 October 2026

The owner subsequently authorized enabling live editing and form submissions. Production was redeployed with `MIGRATION_READ_ONLY=0`; the branch-specific Preview setting remains in review mode. Live authenticated session checks confirmed editing enabled. Project, experience, contact and service-application endpoints passed the write guard and rejected empty submissions with validation errors (422), without creating test records. No DNS was changed.

The redesigned dashboard passed 30 automated tests, a production build, and local database/browser checks covering content saves and inquiry follow-up. Production image uploads remain unavailable until image storage is approved and connected; hosted image URLs are supported. SMTP delivery has not been verified. Credentials and private configuration remain excluded from Git.
