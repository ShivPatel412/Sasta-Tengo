import SwiftUI

struct OverviewView: View {
    @EnvironmentObject private var session: DashboardSession
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
    var body: some View {
        RecordList(resource: selection, picker: AnyView(
            Picker(title, selection: $selection) {
                ForEach(resources) { Text($0.title).tag($0) }
            }.pickerStyle(.segmented)
        ))
        .id(selection)
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
        .navigationTitle(resource.editable ? "Details" : "Lead details")
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
            RecordEditor(record: item, resource: resource) {
                onSave()
                Task { await load() }
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
