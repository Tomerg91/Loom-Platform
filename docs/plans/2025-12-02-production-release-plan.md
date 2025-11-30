# Loom Platform - Production Release Candidate Implementation Plan

**Date Created:** 2025-12-02  \
**Status:** Draft  \
**Owner:** Development Team  \
**Context:** Transition the Loom coaching platform from MVP to a secure, scalable Production Release Candidate, incorporating clarified business rules.

---

## Clarified Business Rules
- **Coach/Client Relationship:** One coach to many clients; no multi-coach collaboration on the same client.
- **Calendar Providers:** Google Calendar only for launch, with two-way sync preferred (provider updates should reflect in-app).
- **Client Editing Rights:** Clients may edit session goals/notes only when explicitly permitted by the coach.

---

## Phase 1: Foundation & Cleanup
1. **Codebase Audit & Standards**
   - Enforce strict TypeScript settings; remove `any` usage in shared modules.
   - Align frontend with functional components/hooks and shadcn/ui primitives.
   - Centralize utilities (date handling, RBAC helpers, formatting) to reduce duplication.
2. **API Contracts & Validation**
   - Document all request/response DTOs; back them with Zod schemas at ingress points.
   - Introduce `ensureArgsSchemaOrThrowHttpError` in legacy operations lacking validation.
3. **Developer Experience**
   - Establish lint/format/typecheck in CI; add pre-commit hooks.
   - Provide environment templates for server/client secrets (Supabase/Firebase, Google OAuth, encryption keys).
4. **Data Model Prep**
   - Review Prisma schema for GDPR-friendly deletion (soft-delete flags and cascade policies).
   - Plan indices for frequent queries (e.g., `SessionLog`, `ClientGoal`, `AvailabilitySlot`).

---

## Phase 2: Feature Implementation
1. **Session Logging with Rich Text Editor**
   - Add rich text editor with sanitized output and autosave drafts.
   - Support attachments/embeds where allowed; store version history.
   - Respect RBAC: coaches see full detail; clients see only fields the coach grants.
2. **Client Dashboard with Goal Tracking**
   - Dashboard widgets: active goals, progress over time, coach feedback snippets.
   - Editing gated by coach permission; audit trail for changes.
   - Include i18n keys for all user-facing text.
3. **Automated Google Calendar Scheduling**
   - Abstract calendar provider (Google-only initially) with two-way sync.
   - Handle timezone-aware availability, conflict detection, reminders, and cancellation flows.
   - Store provider tokens securely; include retry/backoff for sync failures.

---

## Phase 3: Security Hardening & Scalability
1. **RBAC Enforcement**
   - Route guards and server-side checks for coach vs. client scopes; prohibit cross-coach access.
   - Add per-operation authorization helpers and centralized policy definitions.
2. **Data Protection**
   - Encrypt sensitive fields (session notes, reflections) at rest; ensure TLS in transit.
   - Secrets management with rotation plan; audit access to decrypted data paths.
3. **Validation & Sanitization**
   - Zod/Joi validation for all inputs; sanitize rich-text outputs against XSS.
   - Logging and alerting for validation/authorization failures.
4. **Performance & Resilience**
   - Add rate limiting to public APIs; profile and index hot queries.
   - Introduce observability (structured logs, error tracking) and graceful UI degradation (toasts + retry).
5. **Testing Strategy**
   - Unit tests for hooks/components and operations; integration tests for RBAC paths; E2E for scheduling and dashboard flows.

---

## Milestones & Deliverables
- **Week 1:** Complete audit, validation scaffolding, and CI hooks; finalize data model changes and migrations.
- **Weeks 2-3:** Implement Session Logging and Client Dashboard with RBAC + i18n coverage.
- **Week 4:** Deliver Google Calendar integration with two-way sync and retry logic.
- **Week 5:** Security hardening (encryption, rate limiting), performance tuning, and comprehensive testing.
- **Week 6:** Documentation updates (README, API docs), release checklist, and production readiness review.

---

## Acceptance Criteria
- All new features enforce role separation and respect coach-granted client editing rights.
- Sensitive data encrypted at rest; all inputs validated via Zod/Joi with sanitized outputs.
- Zero `any` types in touched TypeScript modules; lint/typecheck/tests pass in CI.
- Observability in place (structured logs, error tracking) and rate limiting enabled for public endpoints.
- README and API documentation updated with setup, permissions model, and calendar configuration steps.
