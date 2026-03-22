---
phase: 16-shared-infrastructure
plan: 02
subsystem: client-ui, client-build
tags: [input-isolation, version-injection, build-config]
dependency_graph:
  requires: []
  provides: [isActive-guarded-AiCliSelector, build-time-version-constant]
  affects: [phase-17-onboarding, phase-18-welcome-section]
tech_stack:
  added: []
  patterns: [isActive-useInput-guard, tsdown-define-substitution]
key_files:
  created:
    - packages/client/src/globals.d.ts
  modified:
    - packages/client/src/ui/components/AiCliSelector.tsx
    - packages/client/src/ui/screens/OnboardingScreen.tsx
    - packages/client/tsdown.config.ts
    - packages/client/src/ui/screens/ChatScreen.tsx
decisions:
  - isActive default true for backward compatibility
  - readFileSync + import.meta.url for package.json version reading in tsdown config
metrics:
  duration: 61s
  completed: "2026-03-20T18:58:17Z"
---

# Phase 16 Plan 02: AiCliSelector Input Isolation + Build-time Version Injection Summary

isActive prop으로 AiCliSelector 키 이벤트 충돌 방지, tsdown define으로 __APP_VERSION__ 빌드타임 주입하여 ChatScreen 하드코딩 버전 제거

## Tasks Completed

| Task | Name | Commit | Key Changes |
|------|------|--------|-------------|
| 1 | AiCliSelector isActive prop + OnboardingScreen 연동 | 8902584 | isActive prop 추가, useInput guard, step 기반 전달 |
| 2 | 빌드타임 버전 주입 + ChatScreen 하드코딩 버전 제거 | 0a0a535 | tsdown define, globals.d.ts, __APP_VERSION__ 사용 |

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

1. **isActive default value = true**: 기존 코드에서 isActive 없이 AiCliSelector를 사용하는 곳이 있을 수 있으므로 backward compatibility를 위해 기본값 true 설정
2. **readFileSync + import.meta.url**: ESM 환경에서 package.json 읽기 위해 `new URL('./package.json', import.meta.url)` 패턴 사용

## Notes

- TypeScript 컴파일 시 기존 pre-existing 에러 존재 (chatNotification.test.ts, useTerminalSize.ts, ConnectionManager.ts 등) -- 본 plan 변경과 무관
- `v0.1.0` 하드코딩 완전 제거 확인 (grep count = 0)
