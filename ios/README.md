# Shiv Dashboard for iPhone and iPad

Native SwiftUI dashboard for the existing website at `https://www.shivpatel.in`. Requires iOS 17 or newer. No additional packages, database, or backend changes.

## Run in Xcode

1. Open `ios/ShivDashboard.xcodeproj` and select the **ShivDashboard** scheme.
2. Select an installed iPhone Simulator, then press **Run** (Command-R).
3. Sign in using the existing website admin email and password. Enter credentials in the app, never in this repository.

For your physical iPhone, select your Apple development team under the app target's **Signing & Capabilities**, choose your connected iPhone as the destination, and run. Distribution through TestFlight or the App Store needs separate signing and release setup; no distribution archive is included.

## Included

- Overview with website counts and lead pipeline. Inquiry totals include bookings, matching the existing website statistics endpoint.
- Contact form leads and service inquiries, with search, pagination, and submission details. The service inquiry list uses `appointments?kind=requests` to show the service/project request form rather than appointment bookings.
- Project and experience lists, details, and editors for existing entries. Pull down to refresh.
- Editing preserves existing media paths and sends only the backend's accepted fields. Gallery, technology, and highlight entries use one item per line. Adding/deleting entries and uploading new media are outside this version's scope.
- Website read-only mode disables saving. Failed saves keep the editor open. Cancel requires confirmation when edits exist.

## Connection and privacy

`ShivDashboard/API.swift` defines the canonical HTTPS origin. Requests reuse the existing `/api/admin` API, including the website's session cookie and exact `Origin` header on writes. No authentication rules or CORS settings are weakened. If deployment changes its canonical origin, update this constant to match the server's `APP_ORIGIN`.

The app uses an ephemeral URLSession with no disk cache or credential storage. Passwords are cleared after each login attempt; cookies and fetched records remain in memory only. Restarting the app requires signing in again. Sign out revokes the website session; if it fails due to a network error, retry. Session expiry returns to login. A privacy cover conceals the app when it is inactive or backgrounded.

## Validation

Run the isolated API and editor contract checks on macOS:

```sh
xcrun swiftc -swift-version 5 -module-cache-path /tmp/shiv-dashboard-module-cache \
  -parse-as-library ios/ShivDashboard/API.swift ios/Tests/ContractChecks.swift \
  -o /tmp/shiv-dashboard-checks
/tmp/shiv-dashboard-checks
```

Build without a signing account for Simulator:

```sh
xcodebuild -project ios/ShivDashboard.xcodeproj -scheme ShivDashboard \
  -configuration Debug -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath ios/build CODE_SIGNING_ALLOWED=NO build
```

Contract checks use synthetic fixtures and a URLProtocol stub, without sending requests to the live site. They cover JSON decoding and large string IDs, media preservation, payload field whitelists, dates and array inputs, login headers, search encoding, session expiry, read-only and validation errors, and invalid server responses.

Verified during implementation: Simulator compilation, contract checks, HTTPS redirect to the canonical host, and HTTP 401 from the live unauthenticated session API. Actual account login, private records, and saves still need an authenticated acceptance pass. Before relying on editing, verify a project and an experience change against the website using an approved test entry. No live records were changed during implementation.
