import SwiftUI

struct OverviewView: View {
    @EnvironmentObject private var session: DashboardSession
    @Environment(\.openURL) private var openURL
    @State private var alexaUnavailable = false
    @State private var counts: [String: JSON] = [:]
    @State private var pipeline: [JSON] = []
    @State private var loading = false
    @State private var error: String?
    @State private var confirmLogout = false
    @State private var updated: Date?

    var body: some View {
        NavigationStack {
            List {
                Section {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Hello, \(session.user?.text("name").isEmpty == false ? session.user!.text("name") : "Shiv")")
                            .font(.title2.bold())
                        Text("Here’s what’s happening on your website.").foregroundStyle(.secondary)
                    }.padding(.vertical, 8)
                    if session.readOnly { ReadOnlyNotice() }
                    if let notice = session.notice { Text(notice).font(.footnote).foregroundStyle(.secondary) }
                }
                Section("Home PC") {
                    Button {
                        openURL(URL(string: "alexa://")!) { opened in
                            alexaUnavailable = !opened
                        }
                    } label: {
                        Label("Open Alexa to wake Shiv", systemImage: "desktopcomputer")
                    }
                    .accessibilityIdentifier("overview.openAlexa")
                    Text("In Alexa, turn on the device named Shiv, or ask “Alexa, turn on Shiv.” Your Echo must stay online at home. Opening Alexa does not send a wake command.")
                        .font(.footnote).foregroundStyle(.secondary)
                }
                if let error {
                    Section { ErrorNotice(message: error); Button("Try again") { Task { await load() } } }
                }
                if loading && counts.isEmpty { ProgressView("Loading dashboard…") }
                if !counts.isEmpty {
                    Section("At a glance") {
                        metric("Contact leads", key: "contacts", icon: "envelope")
                        metric("Unread contacts", key: "unread_contacts", icon: "envelope.badge")
                        metric("Inquiries & bookings", key: "appointments", icon: "bubble.left.and.bubble.right")
                        metric("Pending requests", key: "pending_requests", icon: "clock")
                        metric("Projects", key: "projects", icon: "square.stack.3d.up")
                        metric("Experience", key: "experience", icon: "briefcase")
                    }
                    if !pipeline.isEmpty {
                        Section("Lead pipeline") {
                            ForEach(Array(pipeline.enumerated()), id: \.offset) { _, row in
                                LabeledContent(row.object["lead_status"]?.text.capitalized ?? "Unknown",
                                               value: row.object["total"]?.text ?? "0")
                            }
                        }
                    }
                }
                Section {
                    Label("www.shivpatel.in", systemImage: "network")
                    if let updated { Text("Updated \(updated.formatted(date: .omitted, time: .shortened))").font(.footnote).foregroundStyle(.secondary) }
                    Button("Sign out", role: .destructive) { confirmLogout = true }.disabled(loading)
                }
            }
            .navigationTitle("Overview")
            .alert("Couldn’t open Alexa", isPresented: $alexaUnavailable) {
                Button("OK", role: .cancel) { }
            } message: {
                Text("Install or open the Amazon Alexa app on your iPhone, then turn on the device named Shiv.")
            }
            .refreshable { await load() }
            .task { await load() }
            .confirmationDialog("Sign out of your dashboard?", isPresented: $confirmLogout, titleVisibility: .visible) {
                Button("Sign out", role: .destructive) {
                    Task {
                        loading = true
                        defer { loading = false }
                        do { try await session.signOut() } catch { self.error = error.localizedDescription }
                    }
                }
            }
        }
    }

    private func metric(_ name: String, key: String, icon: String) -> some View {
        HStack {
            Label(name, systemImage: icon)
            Spacer()
            Text(counts[key]?.text ?? "0").font(.title3.monospacedDigit().bold()).foregroundStyle(.indigo)
        }.padding(.vertical, 3)
    }

    private func load() async {
        guard !loading else { return }
        loading = true; error = nil
        defer { loading = false }
        do {
            try await session.refreshSession()
            let data = try await session.api.request("stats").object
            counts = data["counts"]?.object ?? [:]
            pipeline = data["pipeline"]?.array ?? []
            updated = Date()
        } catch { if !Task.isCancelled { self.error = error.localizedDescription } }
    }
}

struct ResourceSwitcher: View {
    let resources: [Resource]
    let title: String
    @State private var selection = Resource.contacts
    init(resources: [Resource], title: String) {
        self.resources = resources; self.title = title
        _selection = State(initialValue: resources.first ?? .contacts)
    }
    var body: some View {
        RecordList(resource: selection, picker: AnyView(
            Picker(title, selection: $selection) {
                ForEach(resources) { Text($0.title).tag($0) }
            }.pickerStyle(.segmented)
        ))
        .id(selection)
    }
}

enum BoardKind: String {
    case tasks, crm
    var columns: [(String, String)] { self == .tasks ? taskColumns : leadColumns }
    var statusKey: String { self == .tasks ? "status" : "lead_status" }
    var title: String { self == .tasks ? "Project tasks" : "Lead CRM" }
}

struct TaskBoardView: View { var body: some View { KanbanBoardView(kind: .tasks) } }
struct CRMView: View { var body: some View { KanbanBoardView(kind: .crm) } }

struct KanbanBoardView: View {
    @EnvironmentObject private var session: DashboardSession
    let kind: BoardKind
    @State private var records: [Record] = []
    @State private var total = 0
    @State private var page = 0
    @State private var search = ""
    @State private var loading = false
    @State private var saving = false
    @State private var error: String?
    @State private var editing: Record?
    @State private var requestID = UUID()

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    if session.readOnly { ReadOnlyNotice() }
                    if let error { ErrorNotice(message: error); Button("Refresh board") { Task { await load(reset: true) } } }
                    if loading && records.isEmpty { ProgressView("Loading board…") }
                    Text(kind == .tasks ? "Drag tasks between columns or use Move to. Tap a card to edit." : "Both lead sources, one pipeline. Tap a card for details and CRM editing.")
                        .font(.footnote).foregroundStyle(.secondary)
                    ScrollView(.horizontal) {
                        HStack(alignment: .top, spacing: 16) {
                            ForEach(kind.columns, id: \.0) { status, title in
                                VStack(alignment: .leading, spacing: 12) {
                                    HStack {
                                        Text(title).font(.headline)
                                        Spacer()
                                        Text(String(records.filter { stage($0) == status }.count)).foregroundStyle(.secondary)
                                    }
                                    ForEach(records.filter { stage($0) == status }, id: \.boardKey) { record in
                                        card(record)
                                    }
                                    if !records.contains(where: { stage($0) == status }) {
                                        Text("No loaded cards").font(.footnote).foregroundStyle(.secondary).padding(.vertical, 28)
                                    }
                                    Spacer(minLength: 8)
                                }
                                .padding(16).frame(width: 300, alignment: .topLeading)
                                .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 18))
                                .dropDestination(for: String.self) { items, _ in
                                    guard !session.readOnly, !saving, let key = items.first,
                                          let record = records.first(where: { $0.boardKey == key }), stage(record) != status else { return false }
                                    Task { await move(record, to: status) }
                                    return true
                                }
                            }
                        }.padding(.bottom, 6)
                    }
                    Text("Showing \(records.count) of \(total). Column counts reflect loaded cards.").font(.caption).foregroundStyle(.secondary)
                    if records.count < total {
                        Button("Load more cards") { Task { await load(reset: false) } }.disabled(loading || saving)
                    }
                }.padding()
            }
            .navigationTitle(kind.title)
            .searchable(text: $search, prompt: kind == .tasks ? "Search tasks or project names" : "Search leads")
            .toolbar {
                if kind == .tasks {
                    Button { editing = Record(fields: [:]) } label: { Label("Add task", systemImage: "plus") }
                        .disabled(session.readOnly || saving)
                }
            }
            .refreshable { await load(reset: true) }
            .task(id: search) {
                do { try await Task.sleep(for: .milliseconds(300)); await load(reset: true) } catch { }
            }
            .sheet(item: $editing) { record in
                if kind == .tasks {
                    TaskForm(record: record.id.isEmpty ? nil : record) { Task { await load(reset: true) } }
                } else {
                    NavigationStack {
                        RecordDetail(resource: Resource(rawValue: record.text("resource")) ?? .contacts, initial: record,
                                     onSave: { Task { await load(reset: true) } })
                    }
                }
            }
        }
    }

    private func stage(_ record: Record) -> String {
        record.text(kind.statusKey).isEmpty ? kind.columns[0].0 : record.text(kind.statusKey)
    }
    private func card(_ record: Record) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Button { editing = record } label: {
                VStack(alignment: .leading, spacing: 6) {
                    Text(kind == .tasks ? record.text("title") : record.text("name")).font(.headline).foregroundStyle(.primary)
                    if kind == .tasks {
                        if !record.text("project_name").isEmpty { Text(record.text("project_name")).font(.subheadline) }
                        if !record.text("description").isEmpty { Text(record.text("description")).lineLimit(3).font(.footnote).foregroundStyle(.secondary) }
                        Label(record.text("priority").capitalized + " priority", systemImage: "flag")
                            .font(.caption).foregroundStyle(record.text("priority") == "high" ? .red : .secondary)
                        if !record.text("due_date").isEmpty { Text("Due " + String(record.text("due_date").prefix(10))).font(.caption) }
                    } else {
                        Text(record.text("email")).font(.subheadline).foregroundStyle(.secondary)
                        Text(record.text("resource") == "contacts" ? "Contact form" : "Service inquiry / booking").font(.caption)
                        if !record.text("summary").isEmpty { Text(record.text("summary")).lineLimit(3).font(.footnote).foregroundStyle(.secondary) }
                    }
                }.frame(maxWidth: .infinity, alignment: .leading)
            }.buttonStyle(.plain)
            Menu {
                ForEach(kind.columns, id: \.0) { key, title in
                    Button(title) { Task { await move(record, to: key) } }.disabled(stage(record) == key)
                }
            } label: { Label("Move to", systemImage: "arrow.right") }.font(.footnote).disabled(session.readOnly || saving || loading)
        }
        .padding(14).background(Color(.systemBackground), in: RoundedRectangle(cornerRadius: 12))
        .draggable(session.readOnly || saving ? "" : record.boardKey)
    }
    private func move(_ record: Record, to stage: String) async {
        guard !saving, !session.readOnly else { return }
        saving = true; error = nil
        defer { saving = false }
        do {
            let path = kind == .tasks ? "tasks/\(record.id)" : "crm/\(record.text("resource"))/\(record.id)"
            let payload: [String: JSON] = kind == .tasks
                ? ["status": .string(stage), "version": .number(Double(record.fields["version"]?.integer ?? 0))]
                : ["lead_status": .string(stage)]
            _ = try await session.api.request(path, method: "PATCH", payload: payload)
            await load(reset: true)
        } catch { self.error = error.localizedDescription }
    }
    private func load(reset: Bool) async {
        if !reset && loading { return }
        let token = UUID(); requestID = token
        loading = true; error = nil
        defer { if requestID == token { loading = false } }
        let next = reset ? 1 : page + 1
        if reset { records = []; page = 0; total = 0 }
        do {
            let result = try await session.api.request(kind.rawValue, query: [URLQueryItem(name: "page", value: String(next)), URLQueryItem(name: "search", value: search)]).object
            guard token == requestID, !Task.isCancelled else { return }
            let incoming = (result["data"]?.array ?? []).map { Record(fields: $0.object) }
            let keys = Set(records.map(\.boardKey))
            records += incoming.filter { !keys.contains($0.boardKey) }
            total = result["count"]?.integer ?? records.count
            page = next
        } catch { if token == requestID && !Task.isCancelled { self.error = error.localizedDescription } }
    }
}

struct WorkflowView: View {
    @EnvironmentObject private var session: DashboardSession
    @AppStorage("hiddenWorkflowIDs") private var hiddenIDs = "[]"
    @State private var workflows: [Record] = []
    @State private var runs: [JSON] = []
    @State private var loading = false
    @State private var busy = false
    @State private var error: String?
    @State private var notice: String?
    @State private var confirmation: Record?
    @State private var pending: (workflow: Record, requestId: String)?
    @State private var managing = false
    @State private var monitoringAvailable = false
    private var hidden: Set<String> { Set((try? JSONDecoder().decode([String].self, from: Data(hiddenIDs.utf8))) ?? []) }
    private var visible: [Record] { workflows.filter { !hidden.contains($0.id) } }

    var body: some View {
        NavigationStack {
            List {
                if session.readOnly { ReadOnlyNotice() }
                if let error { ErrorNotice(message: error) }
                if let notice { Text(notice).font(.callout) }
                if loading { ProgressView("Loading workflows…") }
                if let pending {
                    Button("Check last request") { Task { await run(pending.workflow, requestId: pending.requestId) } }.disabled(busy || session.readOnly)
                }
                if !loading && workflows.isEmpty {
                    ContentUnavailableView("No connected workflows", systemImage: "arrow.triangle.branch",
                                           description: Text("Connect authenticated production webhooks on the server to enable execution."))
                }
                if !workflows.isEmpty && visible.isEmpty { Text("All workflows are hidden. Use Manage visible workflows to show them.").font(.callout) }
                if !monitoringAvailable && !workflows.isEmpty { Text("Live workflow monitoring is unavailable. Showing the last synced list and configured execution hooks.").font(.footnote).foregroundStyle(.secondary) }
                ForEach(visible) { workflow in
                    Section {
                        Text(workflow.text("name")).font(.headline)
                        if !workflow.flag("runnable") { Text("Execution webhook is not connected.").font(.footnote).foregroundStyle(.secondary) }
                        Button { confirmation = workflow } label: { Label(busy ? "Sending…" : "Run workflow", systemImage: "play.fill") }
                            .disabled(busy || session.readOnly || !workflow.flag("runnable") || pending != nil)
                    }
                }
                if !runs.isEmpty {
                    Section {
                        ForEach(Array(runs.enumerated()), id: \.offset) { _, row in
                            VStack(alignment: .leading, spacing: 4) {
                                Text(workflows.first { $0.id == row.object["workflow_id"]?.text }?.text("name") ?? row.object["workflow_id"]?.text ?? "Workflow").font(.headline)
                                Text(row.object["state"]?.text.capitalized ?? "Unknown").font(.subheadline)
                                Text(row.object["created_at"]?.text ?? "").font(.caption).foregroundStyle(.secondary)
                            }
                        }
                    } header: { Text("Recent execution requests") } footer: { Text("Accepted means n8n acknowledged the trigger. Check n8n for workflow completion.") }
                }
                Button("Refresh workflows") { Task { await load() } }.disabled(loading || busy)
            }
            .navigationTitle("Workflows")
            .toolbar { Button { managing = true } label: { Label("Manage visible workflows", systemImage: "line.3.horizontal.decrease") } }
            .sheet(isPresented: $managing) {
                NavigationStack {
                    List {
                        Section { Text("Choose the workflows shown on this iPhone. New workflows appear automatically until you hide them.").font(.footnote).foregroundStyle(.secondary) }
                        ForEach(workflows) { workflow in
                            Toggle(workflow.text("name"), isOn: Binding(get: { !hidden.contains(workflow.id) }, set: { show in
                                var next = hidden
                                if show { next.remove(workflow.id) } else { next.insert(workflow.id) }
                                hiddenIDs = String(data: (try? JSONEncoder().encode(next.sorted())) ?? Data("[]".utf8), encoding: .utf8) ?? "[]"
                            }))
                        }
                        Button("Show all workflows") { hiddenIDs = "[]" }
                    }
                    .navigationTitle("Visible workflows").navigationBarTitleDisplayMode(.inline)
                    .toolbar { Button("Done") { managing = false } }
                }
            }
            .task { await load() }
            .refreshable { await load() }
            .confirmationDialog("Run \(confirmation?.text("name") ?? "workflow") now? This executes its configured actions in n8n.",
                                isPresented: Binding(get: { confirmation != nil }, set: { if !$0 { confirmation = nil } }), titleVisibility: .visible) {
                if let workflow = confirmation {
                    Button("Run workflow") { confirmation = nil; Task { await run(workflow, requestId: UUID().uuidString.lowercased()) } }
                }
            }
        }
    }
    private func load() async {
        guard !loading else { return }
        loading = true
        defer { loading = false }
        do {
            let result = try await session.api.request("workflows").object
            workflows = (result["data"]?.array ?? []).map { Record(fields: $0.object) }
            runs = result["runs"]?.array ?? []
            monitoringAvailable = result["monitoringAvailable"]?.flag ?? false
            error = nil
        } catch { self.error = error.localizedDescription }
    }
    private func run(_ workflow: Record, requestId: String) async {
        guard !busy, !session.readOnly else { return }
        busy = true; error = nil; notice = nil
        pending = (workflow, requestId)
        defer { busy = false }
        do {
            let result = try await session.api.request("workflows/\(workflow.id)/run", method: "POST", payload: ["requestId": .string(requestId)])
            switch result.object["state"]?.text {
            case "accepted": notice = "n8n accepted this execution request. Check n8n for completion."
            case "rejected": notice = "n8n rejected the execution request. Check the webhook configuration."
            default: notice = "The acknowledgement is uncertain. Check n8n before starting another run."
            }
            pending = nil
            await load()
        } catch { self.error = error.localizedDescription + " Use Check last request to safely repeat the same request ID." }
    }
}

struct RecordList: View {
    @EnvironmentObject private var session: DashboardSession
    let resource: Resource
    var picker: AnyView? = nil
    @State private var records: [Record] = []
    @State private var search = ""
    @State private var page = 0
    @State private var total = 0
    @State private var loading = false
    @State private var error: String?
    @State private var requestID = UUID()

    var body: some View {
        NavigationStack {
            List {
                if let picker { Section { picker } }
                if session.readOnly && resource.editable { Section { ReadOnlyNotice() } }
                if let error {
                    Section { ErrorNotice(message: error); Button("Try again") { Task { await load(reset: true) } }.disabled(loading) }
                }
                if loading && records.isEmpty { ProgressView("Loading…") }
                if !loading && records.isEmpty && error == nil {
                    ContentUnavailableView(search.isEmpty ? "No \(resource.title.lowercased()) yet" : "No results",
                                           systemImage: resource.icon,
                                           description: Text(search.isEmpty ? "Your website’s records will appear here." : "Try another search."))
                }
                ForEach(records) { record in
                    NavigationLink {
                        RecordDetail(resource: resource, initial: record, onSave: { Task { await load(reset: true) } })
                    } label: {
                        VStack(alignment: .leading, spacing: 5) {
                            HStack {
                                Text(resource.name(record)).font(.headline)
                                if resource == .contacts && !record.flag("is_read") {
                                    Text("Unread").font(.caption2.bold()).foregroundStyle(.indigo)
                                }
                            }
                            Text(resource.subtitle(record)).font(.subheadline).foregroundStyle(.secondary).lineLimit(2)
                            if !record.text("lead_status").isEmpty {
                                Text(record.text("lead_status").capitalized).font(.caption).foregroundStyle(.secondary)
                            }
                        }.padding(.vertical, 5)
                    }
                }
                if records.count < total {
                    Button { Task { await load(reset: false) } } label: {
                        HStack { Spacer(); if loading { ProgressView() } else { Text("Load more (\(records.count) of \(total))") }; Spacer() }
                    }.disabled(loading)
                }
            }
            .navigationTitle(resource.title)
            .searchable(text: $search, prompt: "Search \(resource.title.lowercased())")
            .refreshable { await load(reset: true) }
            .task(id: search) {
                do { try await Task.sleep(for: .milliseconds(300)); await load(reset: true) } catch { }
            }
        }
    }

    private func load(reset: Bool) async {
        if !reset && loading { return }
        let token = UUID()
        requestID = token
        loading = true; error = nil
        let next = reset ? 1 : page + 1
        if reset { records = []; total = 0; page = 0 }
        defer { if requestID == token { loading = false } }
        do {
            var query = [URLQueryItem(name: "page", value: String(next)), URLQueryItem(name: "search", value: search)]
            if resource == .appointments { query.append(URLQueryItem(name: "kind", value: "requests")) }
            let response = try await session.api.request(resource.rawValue, query: query).object
            guard requestID == token, !Task.isCancelled else { return }
            let incoming = (response["data"]?.array ?? []).map { Record(fields: $0.object) }
            let existing = reset ? [] : records
            let ids = Set(existing.map(\.id))
            records = existing + incoming.filter { !ids.contains($0.id) }
            total = response["count"]?.integer ?? records.count
            page = next
        } catch {
            if requestID == token && !Task.isCancelled { self.error = error.localizedDescription }
        }
    }
}

struct RecordDetail: View {
    @EnvironmentObject private var session: DashboardSession
    let resource: Resource
    let initial: Record
    let onSave: () -> Void
    @State private var current: Record?
    @State private var editing: Record?
    @State private var loading = false
    @State private var error: String?
    private var record: Record { current ?? initial }

    var body: some View {
        List {
            if let error { ErrorNotice(message: error); Button("Try again") { Task { await load() } } }
            if loading { ProgressView("Refreshing…") }
            if session.readOnly && resource.editable { ReadOnlyNotice() }
            Section {
                Text(resource.name(record)).font(.title2.bold())
                Text(resource.subtitle(record)).foregroundStyle(.secondary)
            }
            ForEach(record.fields.keys.sorted().filter { !hidden.contains($0) }, id: \.self) { key in
                if let value = record.fields[key], value != .null, !value.text.isEmpty || !value.object.isEmpty {
                    Section(Self.label(key)) { JSONDetail(value: value) }
                }
            }
        }
        .navigationTitle(resource.isLead ? "Lead details" : "Details")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if resource.editable {
                Button("Edit") { editing = record }
                    .disabled(session.readOnly || loading || current == nil || error != nil)
                    .accessibilityIdentifier("record.edit")
            }
        }
        .task { await load() }
        .refreshable { await load() }
        .sheet(item: $editing) { item in
            if resource.isLead {
                LeadEditor(record: item, resource: resource) { onSave(); Task { await load() } }
            } else {
                RecordEditor(record: item, resource: resource) { onSave(); Task { await load() } }
            }
        }
    }

    private var hidden: Set<String> {
        ["id", "title", resource == .contacts ? "name" : "client_name", "poster_url", "gallery_urls"]
    }
    static func label(_ key: String) -> String {
        let words = key.replacingOccurrences(of: "_", with: " ")
            .replacingOccurrences(of: "([a-z])([A-Z])", with: "$1 $2", options: .regularExpression)
        return words.capitalized.replacingOccurrences(of: "Url", with: "URL")
    }
    private func load() async {
        guard !loading else { return }
        loading = true; error = nil
        defer { loading = false }
        do {
            let result = try await session.api.request("\(resource.rawValue)/\(initial.id)").object
            guard let first = result["data"]?.array.first else { throw APIError(status: 404, message: "This record is no longer available.") }
            current = Record(fields: first.object)
        } catch { self.error = error.localizedDescription }
    }
}

struct JSONDetail: View {
    let value: JSON
    var body: some View {
        if !value.object.isEmpty {
            ForEach(value.object.keys.sorted(), id: \.self) { key in
                VStack(alignment: .leading, spacing: 4) {
                    Text(RecordDetail.label(key)).font(.caption).foregroundStyle(.secondary)
                    // Form submissions have one object level; retain unknown nested values for inspection.
                    Text(display(value.object[key] ?? .null)).textSelection(.enabled)
                }
            }
        } else { Text(display(value)).textSelection(.enabled) }
    }
    private func display(_ json: JSON) -> String {
        if case .object(let fields) = json {
            return fields.keys.sorted().map { "\(RecordDetail.label($0)): \(display(fields[$0]!))" }.joined(separator: "\n")
        }
        if case .array(let values) = json { return values.map(display).joined(separator: "\n") }
        return json == .null ? "—" : json.text
    }
}
