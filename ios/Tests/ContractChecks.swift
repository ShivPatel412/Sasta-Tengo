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
        job.fields["is_current"] = .bool(true)
        assert(job.payload()["end_date"] == .null && job.validation == nil)
        job.fields["start_date"] = .string("2024-02-31")
        assert(job.validation != nil)

        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [StubProtocol.self]
        let api = APIClient(configuration: config)
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
