import Foundation
import LocalAuthentication
import Security

@main
struct AppLockChecks {
    @MainActor static func main() async throws {
        let success = AppLock(evaluate: { _ in true })
        assert(success.locked)
        await success.unlock()
        assert(!success.locked && !success.busy)
        success.lock()
        assert(success.locked)

        let rejected = AppLock(evaluate: { _ in false })
        await rejected.unlock()
        assert(rejected.locked && rejected.error != nil && !rejected.busy)

        let cancelled = AppLock(evaluate: { _ in throw LAError(.userCancel) })
        await cancelled.unlock()
        assert(cancelled.locked && cancelled.error != nil && !cancelled.busy)

        let unavailable = AppLock(evaluate: { _ in throw LAError(.passcodeNotSet) })
        await unavailable.unlock()
        assert(unavailable.locked && unavailable.error != nil)

        var reply: CheckedContinuation<Bool, Never>?
        var attempts = 0
        let delayed = AppLock(evaluate: { _ in
            attempts += 1
            return await withCheckedContinuation { reply = $0 }
        })
        let pending = Task { await delayed.unlock() }
        while reply == nil { await Task.yield() }
        await delayed.unlock()
        assert(attempts == 1 && delayed.busy)
        delayed.lock()
        reply?.resume(returning: true)
        await pending.value
        assert(delayed.locked && !delayed.busy, "Late authentication must not undo a background/session lock")
        let failedRestore = AppLock(evaluate: { _ in true })
        await failedRestore.unlock { _ in throw NSError(domain: "test", code: 1) }
        assert(failedRestore.locked && !failedRestore.busy && failedRestore.error != nil)

        var readCredentials = false
        await rejected.unlock { _ in readCredentials = true }
        assert(!readCredentials, "Never read credentials after failed local authentication")

        var finishRestore: CheckedContinuation<Void, Never>?
        let restoring = AppLock(evaluate: { _ in true })
        let restoration = Task {
            await restoring.unlock { _ in await withCheckedContinuation { finishRestore = $0 } }
        }
        while finishRestore == nil { await Task.yield() }
        restoring.lock()
        finishRestore?.resume()
        await restoration.value
        assert(restoring.locked, "A login finishing in the background must remain locked")

        let now = Date()
        let saved = SavedLogin(email: "fixture@example.test", password: "fixture-only",
            token: String(repeating: "a", count: 64), expires: now.addingTimeInterval(300))
        let cookie = saved.cookie(now: now)!
        assert(cookie.name == "shiv_admin" && cookie.domain == "www.shivpatel.in" && cookie.path == "/" && cookie.isSecure)
        assert(saved.cookie(now: now.addingTimeInterval(301)) == nil)
        var invalid = saved
        invalid.token = "untrusted; token"
        assert(invalid.cookie() == nil)
        let attributes = try LoginKeychain.saveAttributes(saved)
        assert(attributes[kSecAttrAccessControl as String] != nil)
        assert(attributes[kSecAttrSynchronizable as String] as? Bool == false)
        assert(attributes[kSecAttrAccount as String] as? String == "admin")
        assert(attributes[kSecAttrAccessible as String] == nil, "Use the protected access-control object, not a conflicting accessibility attribute")
        let decoded = try JSONDecoder().decode(SavedLogin.self, from: attributes[kSecValueData as String] as! Data)
        assert(decoded.email == saved.email && decoded.password == saved.password && decoded.token == saved.token)
        print("App lock checks passed: success, failure, cancellation, unavailable authentication, duplicate requests, and stale results.")
    }
}
