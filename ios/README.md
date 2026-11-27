# Shiv Dashboard for iPhone and iPad

Native SwiftUI dashboard for the existing website at `https://www.shivpatel.in`. Requires iOS 17 or newer. No additional packages, database, or backend changes.

## Run in Xcode

1. Open `ios/ShivDashboard.xcodeproj` and select the **ShivDashboard** scheme.
2. Select an installed iPhone Simulator, then press **Run** (Command-R).
3. Sign in using the existing website admin email and password. Enter credentials in the app, never in this repository.

For your physical iPhone, select your Apple development team under the app target's **Signing & Capabilities**, choose your connected iPhone as the destination, and run. Distribution through TestFlight or the App Store needs separate signing and release setup; no distribution archive is included.

## Included

- Overview counts open their corresponding record lists. Unread contacts and pending requests use the server’s filters; inquiry and pending lists include bookings so records match the displayed totals. Tap Done to return and refresh the counts.
- Gaming Studio opens the existing responsive website studio inside the app, reusing the current website session. Execution tracking, segments, reel library, publishing calendar and logs match the website; controls unavailable on the website remain unavailable here. Its web cookies/cache stay in a nonpersistent, memory-only web view. Expired login returns to native sign-in; network errors offer retry. External HTTPS links open outside the embedded studio. The native app does not receive worker credentials or start a second dispatcher.
- Overview → Home PC → **Open Alexa to wake Shiv** opens the installed Amazon Alexa app. Turn on the device named **Shiv** there, or ask “Alexa, turn on Shiv.” The button only opens Alexa; it does not send a wake command or confirm that the PC is awake. The linked RemoteRelay skill and your home Echo must remain available. Sleep wake has been tested by the owner; shutdown wake and wake over mobile data still need separate verification. If Alexa cannot open, the dashboard shows installation/opening instructions. Uses Amazon’s documented [`alexa://` iOS link](https://developer.amazon.com/en-GB/blogs/alexa/device-makers/2020/06/creating-a-great-out-of-the-box-experience).
- Task Kanban: create/edit tasks, project names, priorities and due dates; drag cards or use Move to for stage changes.
- Lead CRM board: move both lead sources through the pipeline; open a lead and tap Edit for internal notes, read state or request status. Submitted form answers are preserved.
- Workflows: full synced list, authenticated execution controls and recent launch acknowledgements. Manage visible workflows controls which ones appear on this phone; hidden IDs are saved in local device preferences. Run requires the server's production webhook configuration.
- Contact form leads and service inquiries, with search, pagination, and submission details. The service inquiry list uses `appointments?kind=requests` to show the service/project request form rather than appointment bookings.
- Project and experience lists, details, and editors for existing entries. Pull down to refresh.
- Editing preserves existing media paths and sends only the backend's accepted fields. Gallery, technology, and highlight entries use one item per line. Adding/deleting entries and uploading new media are outside this version's scope.
- Website read-only mode disables saving. Failed saves keep the editor open. Cancel requires confirmation when edits exist.

## Connection and privacy

Sign in once with **Save login for Face ID** enabled. After restarting the app, tap **Sign in with Face ID** instead of entering your email and password. iOS authenticates you and unlocks a protected Keychain item containing your login and latest session cookie. The app reuses an unexpired session after checking it with the website, or obtains a fresh session using the saved login when the eight-hour session expires or is rejected. A changed/invalid password requires manual sign-in again. Network failures preserve the saved login and allow retry. The website’s authentication, session duration and login rate limits are unchanged.

The system supports Touch ID on compatible devices and the device passcode as a fallback. The dashboard locks whenever the app enters the background, including when opening Alexa. Returning requires tapping Unlock again; dashboard navigation and unsaved edits are reset on locking. Cancelling or failing authentication keeps the dashboard locked. Face ID permission is requested by iOS; biometric data never reaches this app or the website. Set up a device passcode if local authentication is unavailable.

`ShivDashboard/API.swift` defines the canonical HTTPS origin. Requests reuse the existing `/api/admin` API, including the website's session cookie and exact `Origin` header on writes. No authentication rules or CORS settings are weakened. If deployment changes its canonical origin, update this constant to match the server's `APP_ORIGIN`.

The app uses an ephemeral URLSession with no disk cache or URL credential storage. With saved login enabled, the email, password and cookie are stored only in an Apple Keychain item protected by `userPresence` and `WhenPasscodeSetThisDeviceOnly`: Face ID/Touch ID or device passcode is required to read it, and it does not sync to iCloud or migrate to another device. Removing the device passcode makes it unavailable. The app sends the password only to the canonical website’s HTTPS login endpoint when needed; it never logs credentials or saves them in preferences. Login form passwords are cleared after each attempt. Preferences hold workflow visibility and a nonsecret saved-login availability flag. Successful sign out revokes the current website session and deletes saved login; retry on a network failure. Signing in with saving disabled also removes any previously saved login. A privacy cover conceals the app when inactive or backgrounded.

Deploy the backend and apply the additive workspace migration before using Tasks and Workflows. See [workspace management setup](../docs/WORKSPACE-MANAGEMENT.md). Rebuild and run this updated app from Xcode to install these features on your iPhone.

## Validation

See [distribution options](DISTRIBUTION.md) for the seven-day signing limit and the App Store release path.

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

Run local authentication state checks (simulated outcomes, no real biometric prompts):

```sh
xcrun swiftc -swift-version 5 -module-cache-path /tmp/shiv-dashboard-module-cache \
  -parse-as-library ios/ShivDashboard/AppLock.swift ios/Tests/AppLockChecks.swift \
  -o /tmp/shiv-applock-checks
/tmp/shiv-applock-checks
```

On an iPhone, sign in once with saving enabled, force-close/reopen, then verify Face ID login without typing credentials. Also check cancellation/retry, passcode fallback, expired/revoked sessions, network failure/retry, background locking, and sign out followed by reopening (saved login must be gone). The automated checks use synthetic credentials and cover lock state, stale results, protected Keychain attributes, cookie validation/expiry and cookie restoration/clearing. Hardware prompts and actual Keychain storage require a manual acceptance check; no real credentials are used in automated checks.

Verified during implementation: Simulator compilation, contract checks, HTTPS redirect to the canonical host, and HTTP 401 from the live unauthenticated session API. Actual account login, private records, and saves still need an authenticated acceptance pass. Before relying on editing, verify a project and an experience change against the website using an approved test entry. No live records were changed during implementation.
