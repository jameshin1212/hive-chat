---
phase: 2
slug: signaling-discovery
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts (root, existing) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~8 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 8 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 2-01-01 | 01 | 1 | DISC-01 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 2-01-02 | 01 | 1 | DISC-02 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 2-02-01 | 02 | 2 | DISC-03 | unit+manual | `npx vitest run` | ❌ W0 | ⬜ pending |
| 2-02-02 | 02 | 2 | IDEN-03 | unit+manual | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/server/vitest.config.ts` — server vitest configuration
- [ ] `packages/server/src/__tests__/` — test directory
- [ ] Server test stubs for geolocation, presence, WebSocket handling

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Nearby user list with real IPs | DISC-02 | Requires real geolocation | Run 2 clients, verify mutual discovery |
| Radius change updates list | DISC-03 | Visual TUI verification | Change radius, verify list updates |
| Online/offline real-time | IDEN-03 | Multi-client timing | Kill one client, verify status change in <1min |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 8s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
