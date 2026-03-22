---
phase: 14
slug: server-optimization
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts (root) |
| **Quick run command** | `npx vitest run packages/server` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run packages/server`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 14-01-01 | 01 | 1 | SOPT-02 | unit | `npx vitest run packages/server` | ❌ W0 | ⬜ pending |
| 14-01-02 | 01 | 1 | SOPT-01 | unit | `npx vitest run packages/server` | ❌ W0 | ⬜ pending |
| 14-01-03 | 01 | 1 | SOPT-03 | unit | `npx vitest run packages/server` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/server/src/__tests__/GeoHashIndex.test.ts` — geohash 인덱스 등록/해제/조회 테스트
- [ ] `packages/server/src/__tests__/FriendReverseIndex.test.ts` — 역 인덱스 등록/해제/조회 테스트
- [ ] `packages/server/src/__tests__/BroadcastRegional.test.ts` — 지역 기반 broadcast 테스트

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 10km 밖 사용자가 USER_JOINED 미수신 | SOPT-01 | 실제 네트워크 환경 필요 | Phase 15에서 검증 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
