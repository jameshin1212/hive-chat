---
phase: 1
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | packages/client/vitest.config.ts (Wave 0 creates) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | DIST-01 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 1-02-01 | 02 | 1 | IDEN-01 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 1-02-02 | 02 | 1 | IDEN-02 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 1-03-01 | 03 | 2 | TUI-01 | manual | macOS terminal | ❌ W0 | ⬜ pending |
| 1-03-02 | 03 | 2 | TUI-02 | manual | Korean IME test | ❌ W0 | ⬜ pending |
| 1-03-03 | 03 | 2 | TUI-04 | manual | Ctrl+C / /quit | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/client/vitest.config.ts` — vitest configuration
- [ ] `packages/client/src/__tests__/identity.test.ts` — stubs for IDEN-01, IDEN-02
- [ ] `packages/shared/src/__tests__/protocol.test.ts` — shared type stubs

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| TUI split layout renders | TUI-01 | Visual terminal rendering | Run `npx cling-talk`, verify message area + input area visible |
| Korean IME composition | TUI-02 | OS IME interaction | Type 한글 in input, verify 조합 visible, no garbling |
| Clean exit | TUI-04 | Signal handling | Press Ctrl+C, verify clean exit without orphan process |
| npx cold start | DIST-01 | Package distribution | `time npx cling-talk` on clean cache, verify < 5s |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
