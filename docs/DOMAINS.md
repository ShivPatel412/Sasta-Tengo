# shivpatel.in — Hostinger / Cloudflare / Vercel

These are instructions only. No DNS lookup of the live zone, account configuration or DNS mutation was performed. Hosting at Hostinger does not establish which service is currently authoritative for DNS; verify the actual nameservers first.

## Decide who manages DNS

The registrar can remain Hostinger while Vercel hosts the application. Cloudflare is optional. Use one authoritative DNS provider and edit its active zone. Keeping the current DNS provider through the hosting cutover reduces the number of simultaneous changes. If Cloudflare is already authoritative, edit Cloudflare; changes in an inactive Hostinger zone will not route traffic.

## Preparation

Export all current DNS records and nameservers, including A, AAAA, CNAME, MX, TXT (SPF, DKIM, DMARC and ownership verification), CAA, SRV and subdomain records. Record old values and TTLs. Preserve the existing mail provider. Do not remove MX records or mail-related host records when moving the website.

Deploy and test on a Vercel URL first. In Vercel Project Settings → Domains, add `shivpatel.in` and `www.shivpatel.in`, choose the canonical hostname, and configure the other to redirect. **Copy the exact DNS values Vercel shows for this project.** Do not guess a generic IP or reuse an old tutorial's CNAME. Vercel may ask for an ownership TXT record; use the exact name/value shown.

Prepare this review table before asking the owner to approve live changes:

| Host | Record | Before | Proposed after | Purpose |
|---|---|---|---|---|
| @ / shivpatel.in | A (or provider-supported apex alias specified by Vercel) | Read from current authoritative zone | Exact Vercel target | New website |
| www | CNAME | Read from current authoritative zone | Exact Vercel CNAME target | Website alias/redirect |
| @ / www | AAAA or other conflicting web records | Read from current authoritative zone | Remove only if Vercel's instructions require it | Prevent split routing |
| Vercel verification host, if requested | TXT | Read from zone | Exact Vercel verification value | Domain ownership |
| Mail and unrelated hosts | Existing records | Export and preserve | Unchanged | Keep email/services working |

Lower only the relevant web-record TTLs in advance if appropriate and approved. Don't mix a nameserver move with a database/app cutover unless there is a specific reason and rollback plan.

## Option A: retain Hostinger DNS

If Hostinger nameservers are authoritative, open hPanel → Domains → Domain portfolio → Manage → DNS / Nameservers (labels may vary). After the owner approves the record table, set the required web A/alias and www CNAME exactly as shown in Vercel. Remove only conflicting web records. Keep all mail records and unrelated subdomains. No nameserver transfer or domain transfer to Vercel is required.

## Option B: use Cloudflare DNS

If already using Cloudflare, edit its active zone after approval. Initially use **DNS only** (grey cloud) for the Vercel web records while verifying domain ownership and certificates; keep any existing proxy configuration unchanged until its effect is reviewed. Avoid a second caching/proxy layer during the initial test.

If moving from Hostinger DNS to Cloudflare, add the domain to Cloudflare and compare the imported zone against the full export; automatic scanning may miss records. Replicate mail and service records exactly. Review DNSSEC before changing nameservers: an old DS record can make the domain fail validation. Follow Cloudflare's documented transition procedure, including disabling old-provider DNSSEC/removing stale DS as appropriate, then enable Cloudflare DNSSEC after activation and publish the new DS through the registrar. The owner must approve nameserver and DNSSEC changes separately from the web A/CNAME table.

Only after zone parity is verified and approved, replace the registrar nameservers with the exact pair assigned by Cloudflare. Keep the old zone intact for rollback. Confirm Cloudflare is authoritative before editing web targets there. Keep mail service records DNS-only; Cloudflare's HTTP proxy is not an SMTP proxy. If proxying Vercel later is desired, validate current vendor compatibility, use verified end-to-end TLS (Full strict), avoid Flexible mode and exempt dashboard/API routes from cache rules. This candidate does not require Cloudflare proxying.

## Validate and roll back

After an approved cutover, check Vercel's domain verification, HTTPS certificates for both hostnames, canonical redirects, portfolio assets, dashboard login, contact/project forms, and received mail. Check both A and AAAA behavior and more than one resolver while allowing for TTL/propagation. Keep the old site in write maintenance until stale DNS clients stop reaching it. Verify mail delivery and SPF/DKIM/DMARC remain healthy.

If routing/TLS fails before accepting new writes, restore the exact old web records. If nameservers changed, rollback may require restoring prior nameservers and matching DNSSEC/DS settings; it is slower than a web-record rollback. After any new writes, follow the database reconciliation procedure in MIGRATION.md before reopening the old application. Do not overwrite the new database with an old backup.

Official instructions: [Vercel custom domains](https://vercel.com/docs/domains/set-up-custom-domain), [Hostinger DNS records](https://support.hostinger.com/en/articles/1583249-how-to-manage-dns-records-at-hostinger), [Cloudflare full setup](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/).
