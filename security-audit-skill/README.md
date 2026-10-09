# Cursor Security Audit Skill

**Version:** 1.1

A reusable Cursor Agent Skill for comprehensive application security audits.

## Install as a project skill

Place the directory at:

```text
.cursor/skills/security-audit/
├── SKILL.md
└── references/
    └── SECURITY-FRAMEWORK.md
```

Or install it globally at:

```text
~/.cursor/skills/security-audit/
```

Then invoke it in Cursor with:

```text
/security-audit
```

Cursor also supports attaching skills with `@`.

## Intended workflow

1. Run the skill in read-only audit mode.
2. Review findings.
3. Ask Cursor to remediate confirmed findings.
4. Run the skill again in verification mode.

The skill includes a dedicated abuse-resistance assessment covering rate limits, concurrency limits, quotas, resource exhaustion, cost controls, distributed enforcement, forwarded-header trust, and common bypass techniques. It also requires an abuse-control matrix in the audit report.

## Important

This skill is designed to improve security posture; it cannot guarantee absence of vulnerabilities. Production penetration testing, infrastructure review, and independent security assessment may still be appropriate for high-risk applications.
