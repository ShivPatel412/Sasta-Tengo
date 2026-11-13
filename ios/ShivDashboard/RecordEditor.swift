import SwiftUI

struct RecordEditor: View {
    @EnvironmentObject private var session: DashboardSession
    @Environment(\.dismiss) private var dismiss
    let record: Record
    let resource: Resource
    let onSave: () -> Void
    @State private var draft: EditDraft
    @State private var categories: [String] = []
    @State private var saving = false
    @State private var error: String?
    @State private var discard = false

    init(record: Record, resource: Resource, onSave: @escaping () -> Void) {
        self.record = record; self.resource = resource; self.onSave = onSave
        _draft = State(initialValue: EditDraft(record: record, resource: resource))
    }

    var body: some View {
        NavigationStack {
            Form {
                if session.readOnly { ReadOnlyNotice() }
                if let error { Section { ErrorNotice(message: error) } }
                Section("Required details") {
                    field("Title", "title")
                    if resource == .experiences { field("Company", "company") }
                    TextField("Description", text: text("description"), axis: .vertical).lineLimit(4...12)
                    if resource == .projects {
                        if categories.isEmpty { field("Category", "category") }
                        else {
                            Picker("Category", selection: text("category")) {
                                ForEach(categoryOptions, id: \.self) { Text($0).tag($0) }
                            }
                        }
                    }
                }
                if resource == .projects {
                    Section("Project") {
                        url("Live URL", "live_url")
                        url("GitHub URL", "github_url")
                        Toggle("Featured project", isOn: flag("is_featured"))
                    }
                    Section {
                        field("Image path or URL", "image", capitalization: .never)
                        field("Poster path or URL", "poster", capitalization: .never)
                        TextField("Gallery: one path or URL per line", text: lines("gallery"), axis: .vertical)
                            .textInputAutocapitalization(.never).autocorrectionDisabled().lineLimit(3...10)
                    } header: { Text("Media") } footer: { Text("Use existing website media paths or hosted URLs. Each gallery entry goes on its own line.") }
                } else {
                    Section("Employment") {
                        field("Location", "location")
                        url("Company website", "website")
                        field("Logo path or URL", "logo", capitalization: .never)
                        field("Start date (YYYY-MM-DD)", "start_date", capitalization: .never)
                        Toggle("I currently work here", isOn: flag("is_current"))
                        if draft.fields["is_current"]?.flag != true {
                            field("End date (YYYY-MM-DD, optional)", "end_date", capitalization: .never)
                        }
                    }
                    Section("Summary & highlights") {
                        TextField("Summary", text: text("summary"), axis: .vertical).lineLimit(2...5)
                        TextField("Highlights: one per line", text: lines("highlights"), axis: .vertical).lineLimit(3...10)
                    }
                }
                Section {
                    TextField("Technologies: one per line", text: lines("technologies"), axis: .vertical).lineLimit(2...8)
                    Stepper("Display order: \(draft.fields["order"]?.integer ?? 0)", value: order, in: 0...2147483647)
                } header: { Text("Organization") } footer: { Text("Changes are saved directly to your website when you tap Save.") }
                if let validation = draft.validation { Text(validation).font(.footnote).foregroundStyle(.secondary) }
            }
            .disabled(saving)
            .navigationTitle(resource == .projects ? "Edit project" : "Edit experience")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { if draft.hasChanges { discard = true } else { dismiss() } }.disabled(saving)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button { Task { await save() } } label: {
                        if saving { ProgressView() } else { Text("Save").bold() }
                    }
                    .disabled(saving || session.readOnly || draft.validation != nil || !draft.hasChanges)
                    .accessibilityIdentifier("editor.save")
                }
            }
            .interactiveDismissDisabled(draft.hasChanges || saving)
            .confirmationDialog("Discard your changes?", isPresented: $discard, titleVisibility: .visible) {
                Button("Discard changes", role: .destructive) { dismiss() }
            }
            .task {
                if resource == .projects {
                    do { categories = try await session.api.request("categories").array.map { $0.object["category"]?.text ?? "" }.filter { !$0.isEmpty } }
                    catch { self.error = error.localizedDescription }
                }
            }
        }
    }

    private var categoryOptions: [String] { Array(Set(categories + [draft.fields["category"]?.text ?? ""])).filter { !$0.isEmpty }.sorted() }
    private var order: Binding<Int> {
        Binding(get: { draft.fields["order"]?.integer ?? 0 }, set: { draft.fields["order"] = .number(Double($0)) })
    }
    private func text(_ key: String) -> Binding<String> {
        Binding(get: { draft.fields[key]?.text ?? "" }, set: { draft.fields[key] = .string($0) })
    }
    private func flag(_ key: String) -> Binding<Bool> {
        Binding(get: { draft.fields[key]?.flag ?? false }, set: { draft.fields[key] = .bool($0) })
    }
    private func lines(_ key: String) -> Binding<String> {
        Binding(get: { draft.fields[key]?.text ?? "" }, set: {
            draft.fields[key] = .array($0.components(separatedBy: "\n").map(JSON.string))
        })
    }
    private func field(_ title: String, _ key: String, capitalization: TextInputAutocapitalization = .sentences) -> some View {
        TextField(title, text: text(key)).textInputAutocapitalization(capitalization).autocorrectionDisabled()
    }
    private func url(_ title: String, _ key: String) -> some View {
        TextField(title, text: text(key)).keyboardType(.URL).textInputAutocapitalization(.never).autocorrectionDisabled()
    }
    private func save() async {
        guard !saving, draft.validation == nil, !session.readOnly else { return }
        saving = true; error = nil
        defer { saving = false }
        do {
            try await session.refreshSession()
            guard !session.readOnly else { throw APIError(status: 503, message: "Website is in read-only mode. Your changes have not been saved.") }
            _ = try await session.api.request("\(resource.rawValue)/\(record.id)", method: "PUT", payload: draft.payload())
            onSave(); dismiss()
        } catch { self.error = error.localizedDescription }
    }
}
