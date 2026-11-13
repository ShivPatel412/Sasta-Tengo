import SwiftUI

@MainActor
final class DashboardSession: ObservableObject {
    let api: APIClient
    @Published var user: Record?
    @Published var readOnly = true
    @Published var notice: String?

    init() {
        api = APIClient()
        api.onUnauthorized = { [weak self] in
            self?.user = nil
            self?.notice = "Your session expired. Please sign in again."
        }
    }

    func refreshSession() async throws {
        let response = try await api.request("session").object
        readOnly = response["readOnly"]?.flag ?? true
        user = Record(fields: response["user"]?.object ?? [:])
    }

    func signIn(email: String, password: String) async throws {
        api.clearCookies()
        _ = try await api.request("login", method: "POST", payload: ["email": .string(email), "password": .string(password)])
        try await refreshSession()
        notice = nil
    }

    func signOut() async throws {
        _ = try await api.request("logout", method: "POST")
        api.clearCookies()
        user = nil
    }
}

@main
struct ShivDashboardApp: App {
    @StateObject private var session = DashboardSession()
    @Environment(\.scenePhase) private var phase

    var body: some Scene {
        WindowGroup {
            Group {
                if session.user == nil { LoginView() }
                else { DashboardTabs() }
            }
            .environmentObject(session)
            .tint(.indigo)
            .privacySensitive()
            .overlay {
                if phase != .active { Color(.systemBackground).ignoresSafeArea().overlay(Image(systemName: "lock.shield").font(.largeTitle)) }
            }
            .onChange(of: phase) { _, value in
                if value == .active && session.user != nil {
                    Task { try? await session.refreshSession() }
                }
            }
        }
    }
}

struct LoginView: View {
    @EnvironmentObject private var session: DashboardSession
    @State private var email = ""
    @State private var password = ""
    @State private var busy = false
    @State private var error: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 28) {
                    Image(systemName: "square.stack.3d.up.fill")
                        .font(.system(size: 38)).foregroundStyle(.indigo)
                        .padding(20).background(.indigo.opacity(0.1), in: RoundedRectangle(cornerRadius: 24))
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Your work.\nOne dashboard.").font(.system(.largeTitle, design: .rounded, weight: .bold))
                        Text("Manage leads, projects and experience for shivpatel.in.")
                            .font(.body).foregroundStyle(.secondary)
                    }
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
                }.padding(28).frame(maxWidth: 520).frame(maxWidth: .infinity).padding(.top, 36)
            }
            .navigationTitle("Shiv Dashboard").navigationBarTitleDisplayMode(.inline)
        }
    }

    private func login() async {
        busy = true; error = nil
        defer { busy = false }
        do {
            try await session.signIn(email: email.trimmingCharacters(in: .whitespacesAndNewlines), password: password)
            password = ""
        } catch { self.error = error.localizedDescription; password = "" }
    }
}

struct DashboardTabs: View {
    var body: some View {
        TabView {
            OverviewView().tabItem { Label("Overview", systemImage: "square.grid.2x2") }
            ResourceSwitcher(resources: [.contacts, .appointments], title: "Leads")
                .tabItem { Label("Leads", systemImage: "tray") }
            RecordList(resource: .projects).tabItem { Label("Projects", systemImage: "square.stack.3d.up") }
            RecordList(resource: .experiences).tabItem { Label("Experience", systemImage: "briefcase") }
        }
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
