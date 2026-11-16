import Foundation

final class StubProtocol: URLProtocol, @unchecked Sendable {
    static var handler: ((URLRequest) throws -> (Int, String))!
    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func startLoading() {
        do {
            let (status, body) = try Self.handler(request)
            let response = HTTPURLResponse(url: request.url!, statusCode: status, httpVersion: nil,
                                           headerFields: ["Content-Type": "application/json"])!
            client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
            client?.urlProtocol(self, didLoad: Data(body.utf8))
            client?.urlProtocolDidFinishLoading(self)
        } catch { client?.urlProtocol(self, didFailWithError: error) }
    }
    override func stopLoading() { }
}

@main
struct ContractChecks {
    @MainActor static func main() async throws {
        let decoded = try JSONDecoder().decode(JSON.self, from: Data(#"{"data":[{"id":"9007199254740993","is_current":true,"technologies":["Swift"],"end_date":null}],"count":"21"}"#.utf8))
        assert(decoded.object["count"]?.integer == 21)
        assert(decoded.object["data"]?.array.first?.object["id"]?.text == "9007199254740993")
        assert(decoded.object["data"]?.array.first?.object["is_current"]?.flag == true)
        let project = Record(fields: ["id": .string("42"), "title": .string("Portfolio"), "description": .string("Website"),
            "category": .string("Web"), "poster": .string("projects/cover.png"), "gallery": .array([.string("projects/a.png")]),
            "technologies": .array([.string("Swift")]), "is_featured": .bool(true), "order": .number(3),
            "poster_url": .string("https://example.test/cover.png"), "created_at": .string("2026-01-01")])
        var draft = EditDraft(record: project, resource: .projects)
        assert(!draft.hasChanges)
        draft.fields["title"] = .string("Updated")
        assert(draft.hasChanges && draft.validation == nil)
        let payload = draft.payload()
        assert(payload["poster"] == project.fields["poster"] && payload["gallery"] == project.fields["gallery"])
        assert(payload["id"] == nil && payload["created_at"] == nil && payload["poster_url"] == nil)
        assert(payload["is_featured"] == .bool(true) && payload["order"] == .number(3))
        draft.fields["technologies"] = .array([.string(" Swift "), .string(""), .string("   ")])
        assert(draft.payload()["technologies"] == .array([.string("Swift")]))
        draft.fields["title"] = .string(" ")
        assert(draft.validation != nil)

        let experience = Record(fields: ["title": .string("Engineer"), "company": .string("Studio"), "description": .string("Build software"),
            "start_date": .string("2024-01-01T00:00:00.000Z"), "end_date": .string("2025-01-01T00:00:00.000Z"), "is_current": .bool(false)])
        var job = EditDraft(record: experience, resource: .experiences)
        assert(job.fields["start_date"] == .string("2024-01-01") && job.validation == nil)
        job.fields["end_date"] = .string("2023-01-01")
        assert(job.validation != nil)

        var lead = EditDraft(record: Record(fields: ["id": .string("3"), "name": .string("Submitted name"),
            "message": .string("Keep original"), "is_read": .bool(false), "admin_notes": .null, "lead_status": .string("new")]), resource: .contacts)
        assert(!lead.hasChanges)
        lead.fields["admin_notes"] = .string("Follow up tomorrow")
        lead.fields["lead_status"] = .string("qualified")
        assert(lead.hasChanges && lead.validation == nil)
        assert(lead.payload()["message"] == nil && lead.payload()["name"] == nil && lead.payload()["id"] == nil)
        assert(lead.payload()["is_read"] == .bool(false) && lead.payload()["lead_status"] == .string("qualified"))
        let inquiry = EditDraft(record: Record(fields: ["status": .string("confirmed"), "request_data": .object(["budget": .string("original")])]), resource: .appointments)
        assert(inquiry.payload()["request_data"] == nil && inquiry.payload()["status"] == .string("confirmed"))
        var task = TaskDraft(record: nil)
        assert(task.validation != nil && task.payload()["version"] == nil)
        task.fields["title"] = .string("Build Kanban")
        task.fields["due_date"] = .string("2026-11-20")
        assert(task.validation == nil)
        task.fields["due_date"] = .string("2026-02-31")
        assert(task.validation != nil)
        task.fields["due_date"] = .string("")
        assert(task.payload()["due_date"] == .null)
        let existingTask = TaskDraft(record: Record(fields: ["id": .string("42"), "title": .string("Task"), "version": .string("3"), "owner_id": .number(7)]))
        assert(existingTask.payload()["version"] == .number(3) && existingTask.payload()["owner_id"] == nil)
        assert(Record(fields: ["id": .string("1"), "resource": .string("contacts")]).boardKey != Record(fields: ["id": .string("1"), "resource": .string("appointments")]).boardKey)
        job.fields["is_current"] = .bool(true)
        assert(job.payload()["end_date"] == .null && job.validation == nil)
        job.fields["start_date"] = .string("2024-02-31")
        assert(job.validation != nil)

        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [StubProtocol.self]
        let api = APIClient(configuration: config)
        let restored = HTTPCookie(properties: [.name: "shiv_admin", .value: String(repeating: "a", count: 64),
            .domain: "www.shivpatel.in", .path: "/", .secure: "TRUE", .expires: Date().addingTimeInterval(300)])!
        api.restoreCookie(restored)
        assert(api.loginCookie?.value == restored.value)
        api.clearCookies()
        assert(api.loginCookie == nil)
        StubProtocol.handler = { request in
            assert(request.url?.absoluteString == "https://www.shivpatel.in/api/admin/login")
            assert(request.httpMethod == "POST")
            assert(request.value(forHTTPHeaderField: "Origin") == APIClient.origin)
            assert(request.value(forHTTPHeaderField: "Content-Type") == "application/json")
            return (200, #"{"ok":true}"#)
        }
        _ = try await api.request("login", method: "POST", payload: ["email": .string("test@example.test"), "password": .string("fixture-only")])
        StubProtocol.handler = { request in
            let query = URLComponents(url: request.url!, resolvingAgainstBaseURL: false)!.queryItems!
            assert(query.contains(URLQueryItem(name: "search", value: "A&B + C")))
            assert(query.contains(URLQueryItem(name: "page", value: "2")))
            assert(query.contains(URLQueryItem(name: "kind", value: "requests")))
            return (200, #"{"data":[],"count":0,"page":2}"#)
        }
        _ = try await api.request("appointments", query: [URLQueryItem(name: "page", value: "2"), URLQueryItem(name: "search", value: "A&B + C"), URLQueryItem(name: "kind", value: "requests")])
        var expired = false
        api.onUnauthorized = { expired = true }
        StubProtocol.handler = { _ in (401, #"{"message":"Please sign in."}"#) }
        do { _ = try await api.request("projects"); assertionFailure("Must reject expired session") }
        catch let error as APIError { assert(error.status == 401 && expired) }
        assert(api.loginCookie == nil)
        expired = false
        do { _ = try await api.request("login", method: "POST"); assertionFailure("Must reject bad login") }
        catch { assert(!expired) }
        StubProtocol.handler = { _ in (422, #"{"message":"Please check your details.","errors":{"title":["Required"]}}"#) }
        do { _ = try await api.request("projects/42", method: "PUT", payload: payload); assertionFailure("Must reject invalid edit") }
        catch { assert(error.localizedDescription.contains("title: Required")) }
        StubProtocol.handler = { _ in (503, #"{"message":"Migration review mode: changes are disabled."}"#) }
        do { _ = try await api.request("projects/42", method: "PUT", payload: payload); assertionFailure("Must reject read-only save") }
        catch { assert(error.localizedDescription.contains("changes are disabled")) }
        StubProtocol.handler = { _ in (200, "<html>Not an API</html>") }
        do { _ = try await api.request("stats"); assertionFailure("Must reject HTML") }
        catch { assert(error.localizedDescription.contains("dashboard data")) }
        print("Passed: decoding, large string IDs, edit preservation, strict payloads, date validation, arrays, login headers, query encoding, session expiry, validation/read-only errors, and invalid responses.")
    }
}
