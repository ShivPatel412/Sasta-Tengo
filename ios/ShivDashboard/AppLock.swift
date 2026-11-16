import Combine
import Foundation
import LocalAuthentication
import Security

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

    func unlock(operation: ((LAContext) async throws -> Void)? = nil) async {
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
            guard context === request else { return }
            if accepted { try await operation?(request) }
            // A result from before backgrounding or signing out must never unlock a new session.
            guard context === request else { return }
            locked = !accepted
            if !accepted { error = "Authentication failed. Please try again." }
        } catch {
            guard context === request else { return }
            self.error = (error as NSError).domain == LAError.errorDomain
                ? "Couldn’t unlock. Try again with Face ID or your device passcode."
                : error.localizedDescription
        }
    }
}

struct SavedLogin: Codable {
    var email: String
    var password: String
    var token: String?
    var expires: Date?

    func cookie(now: Date = Date()) -> HTTPCookie? {
        guard let token, token.count == 64, token.allSatisfy({ "0123456789abcdef".contains($0) }),
              let expires, expires > now else { return nil }
        return HTTPCookie(properties: [.name: "shiv_admin", .value: token, .domain: "www.shivpatel.in",
                                      .path: "/", .secure: "TRUE", .expires: expires])
    }
}

enum LoginKeychain {
    static let query: [String: Any] = [
        kSecClass as String: kSecClassGenericPassword,
        kSecAttrService as String: "in.shivpatel.dashboard.website-login",
        kSecAttrAccount as String: "admin",
        kSecAttrSynchronizable as String: false
    ]

    static func saveAttributes(_ login: SavedLogin) throws -> [String: Any] {
        guard let access = SecAccessControlCreateWithFlags(nil, kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly,
                                                         .userPresence, nil) else {
            throw failure(errSecParam)
        }
        var attributes = query
        attributes[kSecAttrAccessControl as String] = access
        attributes[kSecValueData as String] = try JSONEncoder().encode(login)
        return attributes
    }

    static func save(_ login: SavedLogin) throws {
        let attributes = try saveAttributes(login)
        try remove()
        let status = SecItemAdd(attributes as CFDictionary, nil)
        guard status == errSecSuccess else { throw failure(status) }
    }

    static func read(context: LAContext) async throws -> SavedLogin {
        // Keychain access can block for authentication; keep it off the UI thread.
        try await Task.detached {
            var request = query
            request[kSecReturnData as String] = true
            request[kSecMatchLimit as String] = kSecMatchLimitOne
            request[kSecUseAuthenticationContext as String] = context
            var result: CFTypeRef?
            let status = SecItemCopyMatching(request as CFDictionary, &result)
            guard status == errSecSuccess, let data = result as? Data else { throw failure(status) }
            return try JSONDecoder().decode(SavedLogin.self, from: data)
        }.value
    }

    static func remove() throws {
        let status = SecItemDelete(query as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else { throw failure(status) }
    }

    private static func failure(_ status: OSStatus) -> NSError {
        NSError(domain: NSOSStatusErrorDomain, code: Int(status), userInfo: [NSLocalizedDescriptionKey:
            "Saved login is unavailable. Sign in with your email and password to set up Face ID again."])
    }
}
