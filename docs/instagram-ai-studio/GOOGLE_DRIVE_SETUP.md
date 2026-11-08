# Google Drive selection

No Google app credentials were found in the website. The coding-session Drive
connector does not give this web application account access.

The implemented optional provider uses Google Identity Services and Google
Picker with `https://www.googleapis.com/auth/drive.file`, so access is limited
to files selected for this app. It requests an access token in browser memory,
passes that token once to the authenticated same-origin import endpoint, and
does not save tokens in the database, localStorage or logs. No OAuth client
secret is used by this browser-based token flow. Disconnect revokes the token
for the current session; imported private copies stay in the Studio library.

Required setup by the account owner:

1. Create/select a Google Cloud project. Enable Drive API and Picker API.
2. Configure an OAuth web client with only the actual local and approved
   production JavaScript origins. Configure consent/test users and comply with
   Google's account verification requirements.
3. Create a Picker API key restricted to approved referrers and required APIs.
4. Configure the three `NEXT_PUBLIC_STUDIO_GOOGLE_*` public app identifiers.
   These are browser identifiers, not an OAuth client secret.
5. Test consent, cancellation, expired permissions, selected-file import and
   Disconnect. Ensure the app has no broad `drive`/`drive.readonly` permission.

The importer fetches metadata/content only from fixed Google Drive API URLs,
rejects redirects, enforces image MIME/size limits and normalizes through the
same private upload pipeline. Files from Drive, phone and PC share one library
and can be combined in a draft.

Until configured, the button is disabled with a setup-needed label. This path
has not been live-tested because app credentials and consent are unavailable.

Official references:
- https://developers.google.com/workspace/drive/picker/guides/web-picker
- https://developers.google.com/workspace/drive/picker/guides/overview

Nextcloud is a separate disabled provider. `cloud.shivpatel.in` exists, but no
website-owned scoped WebDAV credential or consent flow was found. Nothing
uses the user's main cloud password or exposes files speculatively. It needs
its own least-privilege integration before the provider is enabled.
