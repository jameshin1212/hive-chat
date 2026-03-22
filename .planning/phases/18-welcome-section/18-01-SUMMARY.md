---
phase: 18-welcome-section
plan: 01
subsystem: client-ui
tags: [welcome, system-messages, splash-removal]
dependency_graph:
  requires: []
  provides: [welcome-system-messages, getBannerText-export]
  affects: [ChatScreen, App, AsciiBanner]
tech_stack:
  added: []
  patterns: [system-message-based-welcome, text-only-banner-export]
key_files:
  created: []
  modified:
    - packages/client/src/ui/components/AsciiBanner.tsx
    - packages/client/src/ui/screens/ChatScreen.tsx
    - packages/client/src/ui/App.tsx
decisions:
  - Welcome content as system messages rather than separate UI component
  - getBannerText pure function export for non-React consumers
metrics:
  duration: 64s
  completed: "2026-03-20T19:44:15Z"
---

# Phase 18 Plan 01: Welcome Section via System Messages Summary

ChatScreen connected handler에 ASCII banner, profile card, version, tips를 시스템 메시지로 표시하고 App.tsx WelcomeBack splash를 제거

## Task Results

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | AsciiBanner getBannerText + ChatScreen welcome messages | 9606a70 | AsciiBanner.tsx, ChatScreen.tsx |
| 2 | App.tsx WelcomeBack splash 제거 + 빌드 검증 | aaea54e | App.tsx |

## Key Changes

### AsciiBanner.tsx
- `getBannerText(breakpoint?)` 함수 export 추가 -- React 컴포넌트 없이 배너 텍스트만 반환
- compact breakpoint이면 PLAIN_BANNER, 그 외 FIGLET_BANNER 반환
- 기존 AsciiBanner React 컴포넌트는 유지 (OnboardingScreen에서 사용)

### ChatScreen.tsx connected handler
5종 시스템 메시지 시퀀스로 교체:
1. ASCII 배너 (getBannerText)
2. 프로필 카드 (nickname#tag | aiCli | Connected)
3. 버전 (HiveChat v{__APP_VERSION__})
4. Tips (Tab, /addfriend, /friends, /help)
5. Connected transition 구분선

### App.tsx
- showWelcomeBack state + setTimeout splash 전체 제거
- 미사용 import 제거 (AsciiBanner, theme, formatIdentityDisplay)
- returning user가 즉시 ChatScreen 진입

## Deviations from Plan

None - plan executed exactly as written.

## Verification

- TypeScript compilation: PASS (pre-existing errors only)
- Client build: PASS (83.58 kB bundle)

## Self-Check: PASSED
