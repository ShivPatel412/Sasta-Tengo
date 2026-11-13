import Foundation

enum JSON: Codable, Equatable, Sendable {
    case string(String), number(Double), bool(Bool), array([JSON]), object([String: JSON]), null

    init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        if c.decodeNil() { self = .null }
        else if let v = try? c.decode(Bool.self) { self = .bool(v) }
        else if let v = try? c.decode(String.self) { self = .string(v) }
        else if let v = try? c.decode(Double.self) { self = .number(v) }
        else if let v = try? c.decode([JSON].self) { self = .array(v) }
        else { self = .object(try c.decode([String: JSON].self)) }
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.singleValueContainer()
        switch self {
        case .string(let v): try c.encode(v)
        case .number(let v): try c.encode(v)
        case .bool(let v): try c.encode(v)
        case .array(let v): try c.encode(v)
        case .object(let v): try c.encode(v)
        case .null: try c.encodeNil()
        }
    }

    var text: String {
        switch self {
        case .string(let v): return v
        case .number(let v): return v.rounded() == v ? String(format: "%.0f", v) : String(v)
        case .bool(let v): return v ? "Yes" : "No"
        case .array(let v): return v.map(\.text).joined(separator: "\n")
        case .object, .null: return ""
        }
    }
    var object: [String: JSON] { if case .object(let v) = self { return v }; return [:] }
    var array: [JSON] { if case .array(let v) = self { return v }; return [] }
    var flag: Bool { self == .bool(true) || self == .number(1) }
    var integer: Int { Int(text) ?? 0 }
}

struct Record: Identifiable, Equatable {
    var fields: [String: JSON]
    var id: String { text("id") }
    func text(_ key: String) -> String { fields[key]?.text ?? "" }
    func flag(_ key: String) -> Bool { fields[key]?.flag ?? false }
}

enum Resource: String, CaseIterable, Identifiable {
    case contacts, appointments, projects, experiences
    var id: String { rawValue }
    var title: String {
        switch self {
        case .contacts: return "Contact leads"
        case .appointments: return "Service inquiries"
        case .projects: return "Projects"
        case .experiences: return "Experience"
        }
    }
    var icon: String {
        switch self {
        case .contacts: return "envelope"
        case .appointments: return "bubble.left.and.bubble.right"
        case .projects: return "square.stack.3d.up"
        case .experiences: return "briefcase"
        }
    }
    var editable: Bool { self == .projects || self == .experiences }
    func name(_ record: Record) -> String {
        record.text(self == .contacts ? "name" : self == .appointments ? "client_name" : "title")
    }
    func subtitle(_ record: Record) -> String {
        record.text(self == .contacts ? "subject" : self == .appointments ? "client_email" : self == .projects ? "category" : "company")
    }
}

struct APIError: LocalizedError {
    let status: Int
    let message: String
    var errorDescription: String? { message }
}

// Never forward a login body or session to a redirected host or downgrade HTTPS.
final class SameOriginRedirects: NSObject, URLSessionTaskDelegate, @unchecked Sendable {
    func urlSession(_ session: URLSession, task: URLSessionTask,
                    willPerformHTTPRedirection response: HTTPURLResponse, newRequest request: URLRequest,
                    completionHandler: @escaping (URLRequest?) -> Void) {
        let original = task.originalRequest?.url
        let same = request.url?.scheme == "https" && request.url?.host == original?.host && request.url?.port == original?.port
        completionHandler(same ? request : nil)
    }
}

@MainActor
final class APIClient {
    static let origin = "https://www.shivpatel.in"
    private let session: URLSession
    var onUnauthorized: (() -> Void)?

    init(configuration: URLSessionConfiguration = .ephemeral) {
        configuration.urlCache = nil
        configuration.requestCachePolicy = .reloadIgnoringLocalCacheData
        configuration.timeoutIntervalForRequest = 30
        configuration.urlCredentialStorage = nil
        session = URLSession(configuration: configuration, delegate: SameOriginRedirects(), delegateQueue: nil)
    }

    func clearCookies() {
        session.configuration.httpCookieStorage?.cookies?.forEach {
            session.configuration.httpCookieStorage?.deleteCookie($0)
        }
    }

    func request(_ path: String, method: String = "GET", payload: [String: JSON]? = nil,
                 query: [URLQueryItem] = []) async throws -> JSON {
        var components = URLComponents(string: Self.origin + "/api/admin/" + path)!
        if !query.isEmpty { components.queryItems = query }
        var request = URLRequest(url: components.url!)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if method != "GET" {
            request.setValue(Self.origin, forHTTPHeaderField: "Origin")
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONEncoder().encode(payload ?? [:])
        }
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw APIError(status: 0, message: "The website returned an invalid response.")
        }
        let result = try? JSONDecoder().decode(JSON.self, from: data)
        guard (200..<300).contains(http.statusCode) else {
            if http.statusCode == 401 && path != "login" { clearCookies(); onUnauthorized?() }
            let message = result?.object["message"]?.text ?? "The website could not complete this request (\(http.statusCode)). Try again."
            let details = result?.object["errors"]?.object.sorted { $0.key < $1.key }
                .map { "\($0.key.replacingOccurrences(of: "_", with: " ")): \($0.value.text)" }.joined(separator: "\n") ?? ""
            throw APIError(status: http.statusCode, message: details.isEmpty ? message : message + "\n" + details)
        }
        guard let result else { throw APIError(status: http.statusCode, message: "The website did not return dashboard data. Try again later.") }
        return result
    }
}

struct EditDraft {
    let resource: Resource
    private let original: [String: JSON]
    var fields: [String: JSON]

    init(record: Record, resource: Resource) {
        self.resource = resource
        original = record.fields
        fields = record.fields
        if resource == .experiences {
            for key in ["start_date", "end_date"] {
                if case .string(let date) = fields[key] { fields[key] = .string(String(date.prefix(10))) }
            }
        }
    }

    func payload() -> [String: JSON] {
        let keys = resource == .projects
            ? ["title", "description", "image", "poster", "gallery", "technologies", "github_url", "live_url", "category", "is_featured", "order"]
            : ["title", "company", "logo", "website", "location", "start_date", "end_date", "is_current", "description", "summary", "highlights", "technologies", "order"]
        var data = fields.filter { keys.contains($0.key) }
        for key in ["technologies"] + (resource == .projects ? ["gallery"] : ["highlights"]) {
            if data[key] == nil || data[key] == .null { data[key] = .array([]) }
            if case .array(let values) = data[key] {
                data[key] = .array(values.map { JSON.string($0.text.trimmingCharacters(in: .whitespacesAndNewlines)) }.filter { !$0.text.isEmpty })
            }
        }
        data["order"] = .number(Double(max(0, data["order"]?.integer ?? 0)))
        let booleanKey = resource == .projects ? "is_featured" : "is_current"
        data[booleanKey] = .bool(data[booleanKey]?.flag ?? false)
        if resource == .experiences && (data["is_current"] == .bool(true) || data["end_date"]?.text.isEmpty != false) {
            data["end_date"] = .null
        }
        return data
    }

    var hasChanges: Bool { payload() != EditDraft(record: Record(fields: original), resource: resource).payload() }
    var validation: String? {
        let required = resource == .projects ? ["title", "description", "category"] : ["title", "company", "start_date", "description"]
        if required.contains(where: { fields[$0]?.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty != false }) {
            return "Complete the required fields."
        }
        if resource == .experiences {
            let formatter = DateFormatter()
            formatter.calendar = Calendar(identifier: .gregorian)
            formatter.locale = Locale(identifier: "en_US_POSIX")
            formatter.dateFormat = "yyyy-MM-dd"
            formatter.isLenient = false
            let start = fields["start_date"]?.text ?? ""
            let end = fields["end_date"]?.text ?? ""
            guard start.count == 10, formatter.date(from: start) != nil else { return "Use YYYY-MM-DD for the start date." }
            if fields["is_current"]?.flag != true && !end.isEmpty {
                guard end.count == 10, formatter.date(from: end) != nil else { return "Use YYYY-MM-DD for the end date." }
                if end < start { return "End date must be on or after start date." }
            }
        }
        return nil
    }
}
