import Foundation
import LocalAuthentication

@main
struct AppLockChecks {
    @MainActor static func main() async {
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
        print("App lock checks passed: success, failure, cancellation, unavailable authentication, duplicate requests, and stale results.")
    }
}
