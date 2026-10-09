# Security Skill Reference Framework

This reference is intentionally a compact index rather than a reproduction of external standards.

## Primary references

- OWASP Top 10:2025 — web application risk categories
  https://top10.owasp.org/2025/

- OWASP ASVS 5.0.0 — detailed application security verification requirements
  https://owasp.org/projects/asvs

- OWASP API Security Top 10 — API-specific risks
  https://owasp.org/API-Security/

- OWASP Software Supply Chain Security Cheat Sheet
  https://cheatsheetseries.owasp.org/cheatsheets/Software_Supply_Chain_Security_Cheat_Sheet.html

- OWASP Software Component Verification Standard (SCVS)
  https://scvs.owasp.org/

- NIST secure software / software supply-chain guidance
  https://www.nist.gov/itl/ssd/software-security-supply-chains

- roadmap.sh Cyber Security Expert roadmap
  https://roadmap.sh/cyber-security

## Priority mapping

OWASP Top 10:2025 categories used by this skill:

1. Broken Access Control
2. Security Misconfiguration
3. Software Supply Chain Failures
4. Cryptographic Failures
5. Injection
6. Insecure Design
7. Authentication Failures
8. Software or Data Integrity Failures
9. Security Logging and Alerting Failures
10. Mishandling of Exceptional Conditions

## Additional coverage domains

The project audit should also consider the broader security domains emphasized by the roadmap.sh Cyber Security Expert roadmap, including networking, host/OS hardening, cloud security, threat modeling, incident response, vulnerability management, logging/forensics, segmentation, zero-trust principles, and common attack classes. These are applied when relevant to the project's architecture rather than treated as a generic checklist.

### Abuse-resistance reference topics

For rate limiting and abuse controls, explicitly consider:

- DoS/DDoS and application-layer exhaustion
- brute force and password spraying
- credential stuffing
- enumeration
- notification abuse
- resource exhaustion
- replay and duplicate submission
- queue flooding and worker starvation
- financial/cost amplification
- cloud/provider quota exhaustion
- distributed deployments and consistent enforcement

## Principle

Use these references to structure coverage, not to replace application-specific threat modeling and evidence-based testing.
