# Next.js-only validation — 29 October 2026

The application now lives at the repository root on branch `codex/nextjs-only`. Public components were ported from the editable frontend source found in GitHub. Next.js App Router owns home, booking, dashboard and API routing. The compiled application bridge, standalone React app, Laravel source, Apache settings, old build scripts and archive were removed from this branch. Git history retains the earlier code.

The root application passes all 22 automated tests and production build without database credentials. Local browser checks cover homepage, booking navigation, form validation, the interactive map and dashboard login page. These checks do not verify restored records, password login, mail or uploads.

Database and uploaded project media were absent from the supplied archive. They must be restored to a private staging environment, reconciled with the source and tested before production cutover. The CV remains missing. No production promotion or DNS change is authorized yet.
