# Installing without weekly re-signing

The current app uses an Apple Personal Team. Its provisioning profiles expire after seven days; code changes cannot remove that Apple restriction. Rebuilding and installing renews the development installation without deleting the app’s data.

For a long-term native installation, enroll the owner’s Apple Account in the Apple Developer Program, then prepare an App Store release. Membership is USD 99 per year or the local price Apple shows during enrollment. A paid membership alone does not publish or convert the existing installation.

An unlisted App Store release is an option to request for a limited audience: Apple reviews the app and the unlisted-distribution request, and approval is not guaranteed. Anyone with the resulting link can find the listing, so the app must retain its existing administrator authentication. App Store distribution avoids the Personal Team’s weekly expiry. Development/ad hoc profiles still expire, typically within a year, and TestFlight builds expire after 90 days.

Before submission: configure the paid team while preserving `in.shivpatel.dashboard`, verify signing and protected Keychain behavior, create the App Store Connect record, complete privacy/support and screenshot metadata, provide Apple with an approved review account and review instructions, archive/upload a Release build, test via TestFlight, then submit for review. Do not put real administrator credentials in source control or public release notes. Account enrollment, payment, review access and publication remain owner-controlled steps; none was performed for this update.

Free alternative: use the website dashboard from Safari and add it to the Home Screen. It uses the web dashboard’s login and features rather than the native app’s Keychain/Face ID flow.

Sources: [Personal Team limits](https://developer.apple.com/help/account/basics/about-your-developer-account/), [membership](https://developer.apple.com/help/account/membership/program-enrollment/), [unlisted distribution](https://developer.apple.com/support/unlisted-app-distribution), [TestFlight validity](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/), [profile expiration](https://developer.apple.com/documentation/Technotes/tn3125-inside-code-signing-provisioning-profiles).
