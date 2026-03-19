---
phase: 05
slug: p2p-upgrade
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-19
---

# Phase 05 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts (root) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~8 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 8 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | TUI-03 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 05-01-02 | 01 | 1 | SOCL-03 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 05-02-01 | 02 | 2 | TUI-03 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |
| 05-02-02 | 02 | 2 | SOCL-03 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Test stubs for ConnectionManager (transport abstraction)
- [ ] Test stubs for P2P protocol messages (shared schemas)
- [ ] Test stubs for server P2P coordination handlers
- [ ] Mock Hyperswarm for unit tests (avoid real network)

*Existing vitest infrastructure covers framework requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| P2P direct connection between two clients | SOCL-03 | Requires two terminals on same/different networks | Start server + 2 clients, verify P2P connection |
| Relay fallback when NAT blocks P2P | SOCL-03 | Network condition simulation | Block P2P port, verify relay fallback |
| StatusBar color changes (direct=green, relay=yellow) | TUI-03 | Visual verification | Connect P2P, check green; block P2P, check yellow |
| Background P2P upgrade during relay chat | SOCL-03 | Timing-dependent behavior | Start relay chat, wait for P2P upgrade |
| Remote friend P2P across networks | SOCL-03 | Requires different network environments | Test with friend on different network/VPN |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 8s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
