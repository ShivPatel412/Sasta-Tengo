# Search discovery, URLs and page caching

## Public discovery

- `/sitemap.xml` is served from `app/sitemap.xml` and lists the two existing public pages: `/` and `/booking`, using the canonical `https://www.shivpatel.in` origin.
- `/robots.txt` is the standard crawler filename (plural). It permits public crawling, lists the sitemap and excludes API/dashboard/private asset paths. It is a crawler hint, not authentication.
- About, services, projects and contact are homepage sections, not separate pages. Do not add nonexistent URLs or fragments to the sitemap. Add real public page URLs when those routes are created.
- Submit the sitemap in the owner's Google Search Console account after verifying the deployed URL. No submission or account changes are automated here.

## Readable permalinks

This application uses Next.js routes, not WordPress. `/booking` already follows a readable page-name URL. There is no blog/post model and no WordPress `/%postname%/` setting to activate. Future posts should use a real slug route such as `/blog/[slug]` when that feature is implemented. Existing section links and booking service-selection query parameters remain functional.

## Public page caching

The public portfolio layout explicitly uses `revalidate = 3600`. Next.js serves cached public page HTML and can regenerate it on the next request after one hour. Deploying new code replaces its built output; cached responses may be served while regeneration completes. This is server/CDN page caching, not offline browser caching.

The scope is the homepage and booking page only. next.config.mjs explicitly sets no-store on API, dashboard and private asset paths, including error responses. Database-backed services/projects are still fetched by the browser from their existing uncached APIs. The cache does not store customer submissions, login sessions, dashboard HTML or authenticated media. No service worker or global “cache everything” rule was added. Do not enable a broad CDN cache rule over `/api`, `/dashboard`, `/hq` or `/master-assets`.

Caching is disabled in `pnpm dev`. To verify the actual production policy, stop dev, run the migration-disabled production build, then start a loopback production server and inspect the homepage/booking Cache-Control and x-nextjs-cache headers. An immediate repeat request should be a cache HIT. Confirm private pages/APIs send no-store as well. A database-free production server can verify HTML and cache headers but cannot perform backend integration tests.

## Apache compatibility

The repository-root `.htaccess` is an optional Apache 2.4 configuration snippet. It preserves Node routing, allows long caching only for successful fingerprinted `/_next/static/` assets and explicitly prevents caching private/API routes. HTML page caching remains owned by Next.js. It contains no WordPress rewrites and cannot turn a static-only hosting account into a Node server.

Vercel and `next start` ignore `.htaccess`; the Next.js cache policy above works independently. No Apache/Hostinger configuration has been installed or replaced. On an Apache host, merge this snippet with the existing approved Node proxy/Passenger configuration rather than overwriting the host's file. The host must permit FileInfo overrides and load mod_headers. Validate behavior on staging before applying it to production.

References: [Next.js sitemap convention](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap), [Next.js page revalidation](https://nextjs.org/docs/app/guides/caching-without-cache-components), [Apache header directives](https://httpd.apache.org/docs/2.4/mod/mod_headers.html).
