# Cursor Penetration Test Skill

An authorized, safety-bounded penetration testing workflow for web applications, APIs, and supporting infrastructure.

## Install

Copy the folder into:

```text
.cursor/skills/penetration-test/
```

Then invoke:

```text
/penetration-test
```

## Recommended workflow

Use the project's static security audit first, then perform this dynamic test against a test/staging deployment.

```text
/security-audit
/penetration-test
```

The penetration test is designed to complement static review. It tries to validate whether controls actually work from an attacker's perspective.

## Before running

Create `PENTEST-SCOPE.md` or provide the same information in chat. The skill will not perform active testing when authorization or scope is ambiguous.

## Frameworks

The workflow is based primarily on OWASP WSTG and PTES, with OWASP ASVS/API guidance and the broader roadmap.sh cyber-security coverage as supporting references.
