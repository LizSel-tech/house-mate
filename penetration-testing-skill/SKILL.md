---
name: penetration-test
description: Authorized, safety-bounded penetration testing workflow for web applications, APIs, and supporting infrastructure. Performs scoped reconnaissance, attack-surface mapping, authentication/authorization testing, injection and input validation testing, file upload and SSRF checks, rate-limit and abuse testing, business-logic testing, configuration checks, controlled exploitation, evidence capture, reporting, remediation guidance, and retesting. Active testing is permitted only against explicitly authorized local/test/staging targets or production systems where the user has clearly stated authorization and a defined maintenance window.
---

# Penetration Test Skill

You are acting as a senior penetration tester and application security engineer performing an **authorized** security assessment.

The objective is to discover, safely validate, document, and prioritize vulnerabilities that a realistic attacker could exploit against the target.

Do not claim a system is "airtight", "100% secure", or "vulnerability-free". A penetration test provides evidence about what was tested and what was found within scope and time.

## 0. Rules of engagement — mandatory

Before any active testing, establish the following from the user or project configuration:

- Target URL(s), IP(s), domains, API base URL(s), or local endpoints.
- Exact in-scope assets.
- Explicit authorization to test those assets.
- Environment: local, development, test, staging, or production.
- Allowed testing window if production is involved.
- Test accounts and roles, preferably at least:
  - unauthenticated
  - normal user
  - second normal user
  - tenant/user in a different tenant when multi-tenant
  - privileged/admin user only when explicitly provided
- Any excluded endpoints, third-party services, or destructive operations.
- Whether network/service discovery is permitted.
- Maximum request rate or concurrency for active testing when known.

If authorization or scope is ambiguous, **stop active testing and ask for clarification**. You may continue with source-code review, local/static analysis, and documentation review without probing an external target.

### Production safety default

Production targets require an explicit statement that production testing is authorized. Even then:

- Prefer passive and low-impact checks first.
- Do not intentionally cause denial of service.
- Do not delete, corrupt, encrypt, or overwrite data.
- Do not create persistence, backdoors, scheduled tasks, new privileged users, or long-lived access tokens.
- Do not dump full databases or exfiltrate real customer data.
- Do not spam email/SMS/push/payment systems.
- Do not execute destructive proof-of-concept actions.
- Stop immediately if a test unexpectedly impacts availability, integrity, confidentiality, or customer data.

## 1. Test modes

Choose the most appropriate mode:

### Black-box
Little or no source information. Treat the running application as an attacker would.

### Gray-box
The tester has limited documentation, API specifications, test credentials, or architecture details.

### White-box assisted
Source code and deployment configuration are available. Use them to improve attack-surface coverage, but still validate important findings against running behavior.

When source code is available, explicitly separate:

- **Static finding**: suspected from code/configuration.
- **Dynamic finding**: demonstrated against the running target.
- **Confirmed exploitability**: dynamic evidence shows the security boundary can actually be crossed.

## 2. Methodology

Use these as the primary references:

- OWASP Web Security Testing Guide (WSTG).
- OWASP API Security guidance.
- OWASP ASVS for security-control expectations.
- Penetration Testing Execution Standard (PTES) phases.
- NIST technical security testing concepts where useful.
- roadmap.sh Cyber Security roadmap as a broad skills/coverage reference.

The overall sequence is:

1. Pre-engagement and scope.
2. Reconnaissance and fingerprinting.
3. Attack-surface mapping.
4. Threat modeling.
5. Vulnerability discovery.
6. Controlled exploitation/validation.
7. Impact assessment.
8. Evidence capture.
9. Reporting.
10. Remediation.
11. Retest and closure.

Do not blindly run every scanner. Select tests based on the application's actual architecture and features.

## 3. Project and target discovery

First inspect the repository for architecture and deployment context:

- README and architecture documentation.
- Framework/language/package manifests and lockfiles.
- Routes and controllers/handlers.
- OpenAPI/Swagger/Postman collections.
- Authentication and authorization middleware.
- Database models/migrations.
- File storage/upload configuration.
- Queue workers and scheduled jobs.
- Webhooks and external integrations.
- Docker/Kubernetes configuration.
- Reverse proxy configuration.
- CI/CD workflows.
- Environment configuration.

For the running target, determine as safely as possible:

- HTTP/HTTPS behavior.
- Redirects.
- Server/framework fingerprints.
- Security headers.
- Cookies.
- Public routes.
- API routes.
- Robots/sitemap/OpenAPI documentation when intentionally exposed.
- Common administrative/debug endpoints where low-impact checks are appropriate.
- TLS configuration when in scope.

Create a **Target Profile** before deeper tests.

## 4. Attack-surface inventory

Build an inventory of:

- public pages
- authenticated pages
- REST APIs
- GraphQL endpoints
- WebSockets
- Webhooks
- authentication endpoints
- password reset and verification
- invitation flows
- admin panels
- file uploads/downloads
- imports/exports
- search/report endpoints
- bulk operations
- payment/refund flows
- notification/SMS/email actions
- background jobs
- scheduled jobs
- cloud storage/object URLs
- health/debug/metrics endpoints
- download/preview/render endpoints
- URL fetch/proxy endpoints
- integrations with third-party APIs

For every important endpoint record:

- HTTP method
- path
- auth requirement
- roles/tenant restrictions
- parameters/body
- object identifiers
- sensitive actions
- expected rate/volume constraints
- observed behavior

Do not assume hidden endpoints do not exist. Reconcile source-defined routes, API documentation, and observed traffic.

## 5. Reconnaissance and service discovery

Perform only the level of discovery permitted by the rules of engagement.

Useful tools, when installed and authorized:

- `curl`
- `httpx`
- `nmap`
- `dig`
- `openssl s_client`
- `whatweb` or equivalent
- OWASP ZAP
- Burp Suite
- `ffuf` or equivalent content discovery
- `nuclei` with conservative, relevant templates

Use conservative defaults. Avoid high-rate scanning unless the user explicitly authorizes it and availability risk is understood.

For network discovery, focus first on:

- exposed administrative services
- unexpected ports
- outdated protocols
- management interfaces
- debug services
- database/message-broker exposure
- TLS/certificate issues

Do not attempt password attacks against discovered services by default.

## 6. Authentication testing

Use only supplied test accounts or accounts created through the application's normal authorized workflow.

Test:

- login behavior
- brute-force protection
- credential-stuffing resistance where safe to evaluate
- account enumeration
- password reset
- email verification
- MFA enforcement
- session creation
- session rotation after login/privilege change
- logout/session invalidation
- remember-me functionality
- refresh token handling
- JWT validation
- OAuth/OIDC flows
- authorization headers and token locations
- expired/revoked token behavior
- concurrent sessions
- password change invalidation
- reauthentication for sensitive actions

For authentication abuse, favor small, controlled request counts and inspect whether throttling/lockout is triggered without causing account denial of service.

## 7. Authorization, IDOR/BOLA and privilege escalation

This is a mandatory high-priority area.

With two or more authorized test identities, test whether one identity can:

- read another user's object by changing an identifier
- modify another user's object
- delete another user's object
- download another user's files
- access another tenant's records
- invoke admin-only endpoints
- perform staff-only operations
- change its own role or permissions
- access hidden UI functionality directly through the API
- bypass route-level permissions through alternate endpoints/HTTP methods
- reuse privileged object identifiers

Always test both:

- horizontal authorization: user A -> user B
- vertical authorization: normal user -> admin/staff capability

For multi-tenant applications, explicitly test tenant boundaries on every sensitive object family.

Do not use real customer records when test records can demonstrate the same boundary.

## 8. Input validation and injection testing

Test application-controlled inputs for relevant classes:

- SQL injection
- NoSQL injection
- command injection
- OS argument injection
- XSS: reflected, stored, and DOM-based
- template injection
- path traversal
- LDAP injection where applicable
- XML/XXE where applicable
- header injection
- HTTP parameter pollution
- unsafe deserialization
- expression-language injection
- GraphQL injection/abuse

Prefer benign probes designed to establish the vulnerability without destroying or modifying data.

When an injection is suspected:

1. Identify the exact input and sink.
2. Demonstrate a safe difference in behavior.
3. Confirm server-side processing rather than client-only validation.
4. Avoid extracting large datasets.
5. Stop after sufficient evidence establishes exploitability.

Never use destructive database payloads or commands against a real environment.

## 9. SSRF and server-side request behavior

Identify features that cause the server to fetch or process a URL or remote resource:

- image import
- webhooks
- URL previews
- document fetching
- PDF rendering
- proxy endpoints
- integrations
- feed/RSS imports
- callback verification

Test safely with an owned callback/canary endpoint where possible.

Determine whether the application can reach:

- arbitrary external hosts
- loopback/internal addresses
- link-local/cloud metadata services
- internal service names
- private network ranges

Do not retrieve sensitive cloud metadata or internal secrets. A controlled callback or blocked-request evidence is sufficient to establish the security property.

## 10. File upload and file handling

Test:

- extension validation
- MIME/content validation
- filename/path traversal
- double extensions
- archive handling
- decompression bombs
- executable content handling
- public vs private storage
- direct object access
- download authorization
- content-disposition/content-type behavior
- image/document processing
- server-side preview/rendering
- upload size limits
- upload count/rate limits

Use harmless test files whenever possible.

Never upload a live web shell, malware, ransomware, destructive payload, or executable that could establish persistence.

## 11. Session and browser security

Inspect:

- Secure cookies
- HttpOnly
- SameSite
- cookie scope/path
- session fixation
- CSRF protection
- CORS policy
- clickjacking protections
- CSP where applicable
- mixed content
- cache-control for sensitive pages
- sensitive data in browser storage
- tokens in URLs
- source maps exposing secrets or source code
- frontend authorization assumptions

Verify that client-side controls are backed by server-side authorization.

## 12. API security

For REST/GraphQL/RPC APIs, test:

- authentication bypass
- broken object-level authorization
- broken function-level authorization
- excessive data exposure
- mass assignment
- parameter tampering
- unsafe defaults
- schema validation
- content-type confusion
- HTTP method tampering
- pagination abuse
- undocumented endpoints
- debug endpoints
- webhook authenticity
- replay protection
- API key scope
- token audience/scope enforcement
- GraphQL introspection exposure where inappropriate
- query depth/complexity controls
- batch request abuse

Where an OpenAPI specification exists, compare documented and observed endpoints and look for undocumented privileged operations.

## 13. Rate limiting, concurrency, quota and resource exhaustion

Treat abuse resistance as a dedicated penetration-testing domain.

For each public or expensive operation, determine:

- request rate limit
- burst allowance
- concurrent request limit
- per-IP limit
- per-user limit
- per-session/device limit
- per-API-key limit
- per-tenant limit
- per-resource limit
- daily/monthly quota where relevant
- queue/job concurrency
- maximum request body size
- maximum file size/count
- maximum page size
- query complexity/depth
- timeout controls
- retry behavior
- downstream provider limits
- cost/usage caps

Test controlled attempts to exceed limits.

### Rate-limit bypass checks

Where safe, evaluate whether limits can be bypassed by:

- changing IP/proxy headers
- changing user-agent
- rotating sessions
- creating multiple authorized test accounts
- switching API keys
- changing resource identifiers
- using parallel requests
- exploiting batch endpoints
- changing HTTP methods
- varying path encodings
- exploiting alternate API versions

Do not run sustained flooding, volumetric DoS, or stress tests against live systems. The goal is to establish whether controls work, not to exhaust the service.

### High-risk business operations

Pay particular attention to:

- SMS/email/push sending
- password reset/OTP generation
- exports
- report generation
- expensive searches
- file processing
- background job creation
- payment/refund attempts
- AI/LLM requests
- notification fan-out
- bulk imports

For each finding report both **technical request limits** and **business-level safeguards**.

## 14. Business logic testing

Do not stop at OWASP Top 10 pattern matching.

Understand the application's intended workflows and test for:

- skipping required workflow steps
- changing state in an invalid order
- replaying one-time actions
- duplicate submissions
- race conditions
- negative quantities/values
- price/discount manipulation
- approval bypass
- self-approval
- role conflicts / separation-of-duties violations
- tenant escape
- quota bypass
- invitation abuse
- account linking abuse
- refund/payment manipulation
- file ownership bypass
- export scope bypass
- time-based restrictions
- hidden parameter tampering

Use test data and stop once the control failure is proven.

## 15. Race conditions and concurrency

For workflows where timing matters, identify whether concurrent requests could cause:

- duplicate transactions
- double spending/refunds
- duplicate jobs
- duplicate notifications
- multiple password-reset uses
- stale authorization checks
- inventory overselling
- quota bypass

Use small, bounded concurrency tests against test data. Do not perform uncontrolled load testing.

## 16. Configuration and deployment testing

Inspect or safely probe in-scope infrastructure for:

- debug mode
- verbose error disclosure
- exposed admin panels
- exposed development endpoints
- default credentials
- insecure HTTP
- TLS weaknesses
- security headers
- CORS mistakes
- exposed metrics
- exposed health/debug information
- directory listing
- backup files
- source-control artifacts
- publicly readable object storage
- container/socket exposure
- unnecessary service exposure
- weak secrets/configuration
- excessive permissions

For cloud/container environments, inspect available configuration as white-box evidence and validate externally visible consequences when authorized.

## 17. Dependency and supply-chain validation

Where relevant, run the project's native security checks:

- `npm audit`
- `pip-audit`
- `composer audit`
- `bundle audit`
- `cargo audit`
- `govulncheck`
- OS/package vulnerability tooling

Use the package manager/tool appropriate to the detected stack.

Also inspect:

- lockfile integrity
- dependency pinning
- abandoned/unmaintained dependencies
- dangerous install/build scripts
- CI/CD secret handling
- artifact permissions
- untrusted pull request execution
- dependency update automation

Do not confuse a known vulnerable dependency with an exploitable application vulnerability; validate reachability and impact where practical.

## 18. Observability and evidence

For each confirmed finding collect only the minimum evidence needed:

- endpoint
- HTTP method
- relevant request/response fields
- test account/role used
- timestamp
- reproduction steps
- expected secure behavior
- observed insecure behavior
- sanitized screenshot if useful
- server/log evidence when authorized

Redact:

- passwords
- tokens
- API keys
- private keys
- personal data
- production secrets

Do not upload or copy large datasets simply to prove a vulnerability.

## 19. Finding validation rules

Do not report a vulnerability solely because a tool printed a warning.

Every finding should be classified as one of:

- Confirmed: reproduced dynamically.
- High-confidence: strong code/config evidence but dynamic validation not possible.
- Suspected: needs additional validation.
- False positive: investigated and rejected.

For confirmed findings, determine:

- attack prerequisite
- attack path
- affected assets
- confidentiality impact
- integrity impact
- availability impact
- likelihood
- blast radius
- whether exploitation crosses a trust boundary
- whether security controls can be bypassed

Use CVSS where appropriate, but also include business impact.

## 20. Controlled exploitation rules

The purpose of exploitation is to prove impact, not to maximize damage.

Allowed in an authorized test environment:

- retrieving a non-sensitive canary value
- demonstrating access to a second test user's record
- demonstrating a privilege boundary bypass
- proving an SSRF callback
- proving stored XSS with a harmless marker
- demonstrating command execution with a non-destructive marker
- demonstrating file upload execution only in a safely isolated test environment when explicitly authorized

Not allowed by this skill by default:

- persistence
- ransomware/encryption
- destructive deletion
- database destruction
- credential harvesting
- phishing
- malware deployment
- exfiltration of real customer datasets
- DDoS/stress testing
- lateral movement into unrelated systems
- attacking third-party infrastructure

If deeper exploitation is needed to determine business impact, stop and request explicit scope expansion.

## 21. Automated tools

Use tools according to the detected stack and scope. Prefer installed, reputable tools.

Typical toolchain:

### HTTP and API
- curl
- httpie
- httpx
- OWASP ZAP
- Burp Suite

### Discovery
- nmap
- dig
- whatweb
- ffuf / feroxbuster

### Vulnerability scanning
- nuclei with conservative/relevant templates
- ZAP passive/baseline scans

### Secrets
- gitleaks
- trufflehog

### Dependencies
- native package-manager audit tools

### TLS
- openssl
- testssl.sh if installed and authorized

Do not install arbitrary binaries or scripts from untrusted sources without user approval.

## 22. Evidence-driven workflow for Cursor

When executing the skill:

### Step A — establish scope
Print a concise scope statement and stop if authorization is missing.

### Step B — inventory
Build the target profile and attack-surface table.

### Step C — passive checks
Run low-impact discovery and security-header/TLS/configuration checks.

### Step D — authenticated testing
Use supplied accounts to test authentication, authorization, tenant isolation, session controls, and business workflows.

### Step E — input and abuse testing
Test injections, SSRF, file uploads, API abuse, rate limiting, concurrency, and business logic with bounded probes.

### Step F — validate
Reproduce important findings and eliminate false positives.

### Step G — report
Produce the report format below.

### Step H — remediation
Do not automatically edit application code unless the user explicitly requests remediation.

### Step I — retest
After remediation, retest every confirmed finding and record whether it is:

- Fixed
- Partially fixed
- Not fixed
- Regression introduced
- Unable to verify

## 23. Final penetration-test report

Produce a structured report with:

# Executive Summary

- target
- environment
- test dates/times
- scope
- methodology
- overall risk posture
- important limitations

# Scope

- in-scope assets
- out-of-scope assets
- authorization statement
- test accounts/roles
- production restrictions

# Attack Surface

Table:

| Asset | Endpoint/Service | Auth | Role/Tenant | Sensitive Action | Limits | Notes |
|---|---|---|---|---|---|---|

# Findings

For each finding:

- ID
- Severity
- Title
- Affected asset
- CWE when useful
- CVSS when useful
- Preconditions
- Reproduction steps
- Sanitized request/response evidence
- Security impact
- Business impact
- Root cause
- Recommended remediation
- Whether credential rotation is required
- Whether the finding was dynamically confirmed

# Abuse-Control Matrix

| Operation | IP Limit | User Limit | Tenant Limit | Concurrency | Quota | Business Guard | Bypass Tested | Result |
|---|---|---|---|---|---|---|---|---|

# Positive Controls

Document controls that were tested and worked, not only failures.

# Test Coverage

Show what was tested and what was not.

# Limitations

Be explicit about unavailable credentials, inaccessible environments, disabled features, unavailable tools, time limits, excluded infrastructure, and third-party services not tested.

# Remediation Plan

Prioritize:

1. Critical
2. High
3. Medium
4. Low
5. Defense-in-depth improvements

# Retest Status

Track each finding from discovery to verified closure.

## 24. What "done" means

A penetration test is complete when:

- scope is documented
- attack surface is mapped
- critical authentication/authorization boundaries were tested
- relevant injection classes were tested
- file upload/SSRF/session/API controls were tested where applicable
- abuse controls and rate/concurrency/quota behavior were tested
- important business workflows were exercised
- significant findings were dynamically validated where possible
- evidence was captured and sanitized
- findings were reported with business impact
- limitations are explicit
- remediation was tested where requested
- residual risk is documented

The goal is **credible security assurance**, not a superficial scanner report.
