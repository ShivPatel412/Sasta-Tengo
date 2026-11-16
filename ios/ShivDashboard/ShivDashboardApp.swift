import SwiftUI
import LocalAuthentication
import Security

@MainActor
final class DashboardSession: ObservableObject {
    let api: APIClient
    @Published var user: Record?
    @Published var readOnly = true
    @Published var notice: String?
    @Published private(set) var hasSavedLogin = UserDefaults.standard.bool(forKey: "hasSavedLogin")

    init() {
        api = APIClient()
        api.onUnauthorized = { [weak self] in
            self?.user = nil
            self?.notice = "Your session expired. Use Face ID or sign in again."
        }
    }

    func refreshSession() async throws {
        let response = try await api.request("session").object
        readOnly = response["readOnly"]?.flag ?? true
        user = Record(fields: response["user"]?.object ?? [:])
    }

    func signIn(email: String, password: String, remember: Bool = true) async throws {
        api.clearCookies()
        _ = try await api.request("login", method: "POST", payload: ["email": .string(email), "password": .string(password)])
        try await refreshSession()
        notice = nil
        do {
            if remember {
                try LoginKeychain.save(SavedLogin(email: email, password: password,
                    token: api.loginCookie?.value, expires: api.loginCookie?.expiresDate))
                setSavedLogin(true)
            } else {
                try LoginKeychain.remove()
                setSavedLogin(false)
            }
        } catch {
            setSavedLogin(false)
            notice = "Signed in, but Face ID login could not be saved. Check that your iPhone has a passcode set."
        }
    }

    func signInWithFaceID(context: LAContext) async throws {
        let saved: SavedLogin
        do { saved = try await LoginKeychain.read(context: context) }
        catch {
            if (error as NSError).code == Int(errSecItemNotFound) { setSavedLogin(false) }
            throw error
        }
        if let cookie = saved.cookie() {
            api.restoreCookie(cookie)
            do { try await refreshSession(); notice = nil; return }
            catch {
                guard (error as? APIError)?.status == 401 else { throw error }
            }
        }
        do { try await signIn(email: saved.email, password: saved.password) }
        catch {
            if (error as? APIError)?.status == 401 {
                try? LoginKeychain.remove()
                setSavedLogin(false)
            }
            throw error
        }
    }

    private func setSavedLogin(_ saved: Bool) {
        hasSavedLogin = saved
        UserDefaults.standard.set(saved, forKey: "hasSavedLogin")
    }

    func signOut() async throws {
        do { _ = try await api.request("logout", method: "POST") }
        catch { guard (error as? APIError)?.status == 401 else { throw error } }
        try LoginKeychain.remove()
        setSavedLogin(false)
        api.clearCookies()
        user = nil
    }
}

@main
struct ShivDashboardApp: App {
    @StateObject private var session = DashboardSession()
    @StateObject private var appLock = AppLock()
    @Environment(\.scenePhase) private var phase

    var body: some Scene {
        WindowGroup {
            Group {
                if session.user == nil { LoginView() }
                else if appLock.locked { UnlockView(appLock: appLock) }
                else { DashboardTabs() }
            }
            .environmentObject(session)
            .environmentObject(appLock)
            .tint(.indigo)
            .privacySensitive()
            .overlay {
                if phase != .active { Color(.systemBackground).ignoresSafeArea().overlay(Image(systemName: "lock.shield").font(.largeTitle)) }
            }
            .onChange(of: phase) { _, value in
                if value == .background { appLock.lock() }
                if value == .active && session.user != nil && !appLock.locked {
                    Task { try? await session.refreshSession() }
                }
            }
            .onChange(of: session.user?.id) { _, id in if id == nil { appLock.lock() } }
        }
    }
}

struct UnlockView: View {
    @EnvironmentObject private var session: DashboardSession
    @ObservedObject var appLock: AppLock
    @State private var signingOut = false
    @State private var signOutError: String?

    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "faceid").font(.system(size: 52)).foregroundStyle(.indigo)
            Text("Dashboard locked").font(.title2.bold())
            Text("Use Face ID or your device passcode to unlock. Touch ID works on supported devices.")
                .foregroundStyle(.secondary).multilineTextAlignment(.center)
            if let error = appLock.error ?? signOutError { ErrorNotice(message: error) }
            Button {
                Task {
                    await appLock.unlock()
                    if !appLock.locked { try? await session.refreshSession() }
                }
            } label: {
                Label(appLock.busy ? "Authenticating…" : "Unlock dashboard", systemImage: "lock.open")
            }
            .buttonStyle(.borderedProminent)
            .disabled(appLock.busy || signingOut)
            .accessibilityIdentifier("lock.unlock")
            Button("Sign out", role: .destructive) {
                Task {
                    signingOut = true
                    defer { signingOut = false }
                    do { try await session.signOut() }
                    catch { signOutError = error.localizedDescription }
                }
            }.disabled(appLock.busy || signingOut)
        }
        .padding(28).frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(.systemBackground).ignoresSafeArea())
        .accessibilityIdentifier("lock.screen")
    }
}

struct LoginView: View {
    @EnvironmentObject private var session: DashboardSession
    @EnvironmentObject private var appLock: AppLock
    @State private var email = ""
    @State private var password = ""
    @State private var busy = false
    @State private var error: String?
    @State private var usePassword = false
    @State private var remember = true

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 28) {
                    Image(systemName: "square.stack.3d.up.fill")
                        .font(.system(size: 38)).foregroundStyle(.indigo)
                        .padding(20).background(.indigo.opacity(0.1), in: RoundedRectangle(cornerRadius: 24))
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Your work.\nOne dashboard.").font(.system(.largeTitle, design: .rounded, weight: .bold))
                        Text("Manage leads, tasks, workflows and your portfolio for shivpatel.in.")
                            .font(.body).foregroundStyle(.secondary)
                    }
                    if session.hasSavedLogin {
                        Button {
                            Task {
                                busy = true
                                defer { busy = false }
                                await appLock.unlock { context in try await session.signInWithFaceID(context: context) }
                            }
                        } label: {
                            Label(busy ? "Signing in…" : "Sign in with Face ID", systemImage: "faceid")
                                .frame(maxWidth: .infinity).padding(.vertical, 9)
                        }
                        .buttonStyle(.borderedProminent).controlSize(.large)
                        .disabled(busy || appLock.busy)
                        .accessibilityIdentifier("login.faceID")
                        Text("Face ID or your device passcode securely unlocks your saved login.")
                            .font(.footnote).foregroundStyle(.secondary)
                        Button(usePassword ? "Hide password login" : "Use email and password") { usePassword.toggle() }
                            .disabled(busy)
                    }
                    if let error = appLock.error { ErrorNotice(message: error) }
                    if !session.hasSavedLogin || usePassword {
                        VStack(spacing: 16) {
                            TextField("Admin email", text: $email)
                                .textContentType(.username).keyboardType(.emailAddress)
                                .textInputAutocapitalization(.never).autocorrectionDisabled()
                                .accessibilityIdentifier("login.email")
                            Divider()
                            SecureField("Password", text: $password)
                                .textContentType(.password).accessibilityIdentifier("login.password")
                                .onSubmit { if !busy && !email.isEmpty && !password.isEmpty { Task { await login() } } }
                        }
                        .padding(20).background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 18))
                        Toggle("Save login for Face ID", isOn: $remember).disabled(busy)
                        Text("Stores your login in this iPhone’s protected Keychain. Sign out removes it.")
                            .font(.footnote).foregroundStyle(.secondary)
                        if let message = error ?? session.notice { ErrorNotice(message: message) }
                        Button { Task { await login() } } label: {
                            HStack {
                                Spacer()
                                if busy { ProgressView().tint(.white) }
                                Text(busy ? "Signing in…" : "Sign in")
                                Spacer()
                            }.padding(.vertical, 9)
                        }
                        .buttonStyle(.borderedProminent).controlSize(.large)
                        .disabled(busy || email.trimmingCharacters(in: .whitespaces).isEmpty || password.isEmpty)
                        .accessibilityIdentifier("login.submit")
                        Label("Use your existing website admin account.", systemImage: "lock.shield")
                            .font(.footnote).foregroundStyle(.secondary)
                    }
                }.padding(28).frame(maxWidth: 520).frame(maxWidth: .infinity).padding(.top, 36)
            }
            .navigationTitle("Shiv Dashboard").navigationBarTitleDisplayMode(.inline)
        }
    }

    private func login() async {
        busy = true; error = nil
        defer { busy = false }
        do {
            try await session.signIn(email: email.trimmingCharacters(in: .whitespacesAndNewlines), password: password, remember: remember)
            password = ""
        } catch { self.error = error.localizedDescription; password = "" }
    }
}

struct DashboardTabs: View {
    var body: some View {
        TabView {
            OverviewView().tabItem { Label("Overview", systemImage: "square.grid.2x2") }
            CRMView().tabItem { Label("Lead CRM", systemImage: "person.2") }
            TaskBoardView().tabItem { Label("Tasks", systemImage: "rectangle.split.3x1") }
            WorkflowView().tabItem { Label("Workflows", systemImage: "arrow.triangle.branch") }
            PortfolioView().tabItem { Label("Portfolio", systemImage: "briefcase") }
        }
    }
}

struct PortfolioView: View {
    var body: some View {
        ResourceSwitcher(resources: [.projects, .experiences], title: "Portfolio")
    }
}

struct ErrorNotice: View {
    let message: String
    var body: some View {
        Label(message, systemImage: "exclamationmark.circle")
            .font(.callout).foregroundStyle(.red).textSelection(.enabled)
            .accessibilityIdentifier("error.notice")
    }
}

struct ReadOnlyNotice: View {
    var body: some View {
        Label("Website is in read-only mode. Editing is disabled.", systemImage: "lock")
            .font(.footnote).foregroundStyle(.secondary)
    }
}
