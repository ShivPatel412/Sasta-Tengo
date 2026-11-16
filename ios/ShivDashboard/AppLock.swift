import Combine
import LocalAuthentication

@MainActor
final class AppLock: ObservableObject {
    @Published private(set) var locked = true
    @Published private(set) var busy = false
    @Published private(set) var error: String?
    private var context: LAContext?
    private let evaluate: (LAContext) async throws -> Bool

    init(evaluate: @escaping (LAContext) async throws -> Bool = { context in
        var error: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error) else {
            throw error ?? NSError(domain: LAError.errorDomain, code: LAError.passcodeNotSet.rawValue)
        }
        return try await context.evaluatePolicy(.deviceOwnerAuthentication,
                                               localizedReason: "Unlock your private dashboard.")
    }) {
        self.evaluate = evaluate
    }

    func lock() {
        context?.invalidate()
        context = nil
        locked = true
        busy = false
        error = nil
    }

    func unlock() async {
        guard locked, !busy else { return }
        let request = LAContext()
        context = request
        busy = true
        error = nil
        defer {
            if context === request { context = nil; busy = false }
        }
        do {
            let accepted = try await evaluate(request)
            // A result from before backgrounding or signing out must never unlock a new session.
            guard context === request else { return }
            locked = !accepted
            if !accepted { error = "Authentication failed. Please try again." }
        } catch {
            guard context === request else { return }
            self.error = "Dashboard remains locked. Try again with Face ID or your device passcode. If unavailable, set up Face ID or a passcode in iPhone Settings."
        }
    }
}
