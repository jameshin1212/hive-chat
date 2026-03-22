---
phase: 17-onboarding-polish
verified: 2026-03-21T05:00:00Z
status: human_needed
score: 5/6 must-haves verified
human_verification:
  - test: "한글 IME 조합 regression 없음 확인"
    expected: "ㅎ+ㅏ+ㄴ = 한 조합이 정상 완성되고, 입력 중 깨짐/밀림 없음"
    why_human: "런타임 IME 동작은 코드 분석으로 검증 불가 — 실제 터미널에서 수동 확인 필요"
---

# Phase 17: Onboarding Polish Verification Report

**Phase Goal:** 첫 실행 사용자가 닉네임/AI CLI 설정 과정에서 현재 위치와 전체 진행 상태를 명확히 인지하며, 터미널 크기에 관계없이 깔끔한 UI를 본다
**Verified:** 2026-03-21T05:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | 온보딩 각 단계에서 Step 1/2, Step 2/2 indicator가 표시된다 | VERIFIED | `OnboardingScreen.tsx:48,72` — `<Text dimColor>Step {currentStep}/{totalSteps}</Text>` 렌더링, currentStep = 1(nickname) / 2(ai-cli) |
| 2 | 닉네임 입력과 AI CLI 선택 영역이 Box border(single, cyan)로 감싸져 있다 | VERIFIED | `OnboardingScreen.tsx:50-51,74-75` — `borderStyle="single"` + `borderColor={theme.text.info}` (cyan) 두 Box 모두 적용 |
| 3 | >=80col 터미널에서 figlet ASCII 배너가 표시된다 | VERIFIED | `AsciiBanner.tsx:22` — `breakpoint === 'compact' ? PLAIN_BANNER : FIGLET_BANNER`. `getBreakpoint`는 `columns < 80`일 때만 compact 반환, 80 이상은 standard/wide → figlet 표시 |
| 4 | <80col 터미널에서 plain text fallback 배너가 표시된다 | VERIFIED | `useTerminalSize.ts:19` — `if (columns < COMPACT_MAX_WIDTH) return 'compact'`, `COMPACT_MAX_WIDTH = 80`. compact → `AsciiBanner.tsx:22`에서 `PLAIN_BANNER = '=== HIVECHAT ==='` 표시 |
| 5 | welcome step이 제거되고 첫 화면에서 바로 닉네임 입력이 가능하다 | VERIFIED | `OnboardingScreen.tsx:12` — `type OnboardingStep = 'nickname' \| 'ai-cli'` (welcome 없음), `useState<OnboardingStep>('nickname')` 초기 step |
| 6 | 한글 IME 조합이 정상 동작한다 (regression 없음) | UNCERTAIN | IMETextInput이 `string-width` 사용, `useInput` hook 기반 — 런타임 동작은 코드 분석으로 확인 불가 |

**Score:** 5/6 truths verified (1개 human 필요)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/client/src/ui/components/AsciiBanner.tsx` | breakpoint 기반 적응형 ASCII 배너 | VERIFIED | 24줄, `Breakpoint` type import, `breakpoint === 'compact'` 분기, `PLAIN_BANNER`/`FIGLET_BANNER` 분기 렌더링 |
| `packages/client/src/ui/screens/OnboardingScreen.tsx` | 통합 온보딩 화면 (step indicator + Box border) | VERIFIED | 86줄, `'nickname' \| 'ai-cli'` 2-step, Step 1/2 및 Step 2/2 표시, Box borderStyle single+cyan 양 step 모두 적용 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| OnboardingScreen.tsx | useTerminalSize | hook import | WIRED | `OnboardingScreen.tsx:6` import + `:22` `const { breakpoint } = useTerminalSize()` 호출 |
| OnboardingScreen.tsx | AsciiBanner | breakpoint prop 전달 | WIRED | `OnboardingScreen.tsx:47` `<AsciiBanner breakpoint={breakpoint} />`, `OnboardingScreen.tsx:71` 두 번째 step에서도 동일 |
| AsciiBanner.tsx | Breakpoint type | useTerminalSize.ts import | WIRED | `AsciiBanner.tsx:5` `import type { Breakpoint } from '../../hooks/useTerminalSize.js'` |
| AsciiBanner.tsx | compact 분기 | prop 조건부 렌더링 | WIRED | `AsciiBanner.tsx:22` `const bannerText = breakpoint === 'compact' ? PLAIN_BANNER : FIGLET_BANNER` |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| ONBD-01 | 17-01-PLAN.md | 온보딩 화면에 step indicator 표시 (1/2, 2/2) | SATISFIED | `OnboardingScreen.tsx:48,72` — Step {currentStep}/{totalSteps} 양 step에 표시 |
| ONBD-02 | 17-01-PLAN.md | 온보딩 화면 Box border/style 시각 개선 | SATISFIED | `OnboardingScreen.tsx:50-51,74-75` — borderStyle="single" + borderColor=cyan(theme.text.info) 적용 |
| ONBD-03 | 17-01-PLAN.md | 터미널 폭에 따라 ASCII 배너 적응형 표시 (축소/숨김) | SATISFIED | `AsciiBanner.tsx:22` + `useTerminalSize.ts:19` — COMPACT_MAX_WIDTH=80 기준 compact/standard 분기, plain text/figlet 전환 |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (없음) | — | — | — | — |

Phase 17 수정 파일에서 TODO, FIXME, 빈 구현체, placeholder 없음 확인.

### TypeScript 컴파일 상태

Phase 17 대상 파일(`AsciiBanner.tsx`, `OnboardingScreen.tsx`)에서 TypeScript 에러 없음.

프로젝트 전체에는 기존 에러 존재:
- `chatNotification.test.ts` — MockInstance 타입 호환성 (테스트 파일, phase 17 범위 외)
- `HyperswarmTransport.ts` — 타입 선언 누락 (phase 17 범위 외)
- `SignalingClient.test.ts` — WebSocket mock 타입 (테스트 파일, phase 17 범위 외)
- `ChatScreen.tsx:289` — 타입 비교 오류 (phase 17 범위 외)

이 에러들은 phase 17 이전부터 존재하며 phase 17 변경 사항과 무관.

### Human Verification Required

#### 1. 한글 IME 조합 테스트

**Test:** 온보딩 닉네임 입력 필드에서 한글 입력 시도 (예: "테스트", "ㅎ+ㅏ+ㄴ = 한")
**Expected:** 조합 중 문자가 깨지거나 밀리지 않고 자연스럽게 완성됨. 실제 제출은 영문만 허용이지만 조합 과정 자체가 정상이어야 함
**Why human:** IME 조합 상태는 런타임 keystroke 이벤트 처리에 따르며, 코드 정적 분석으로는 실제 조합 동작 보장 불가

#### 2. 터미널 크기 반응형 배너 전환 (선택적 확인)

**Test:** 터미널을 79col로 축소 후 온보딩 실행
**Expected:** ASCII art 대신 `=== HIVECHAT ===` plain text 표시
**Why human:** 터미널 resize 이벤트 동작과 실제 렌더링 결과는 런타임에서만 확인 가능

### Gaps Summary

Phase 17의 모든 자동화 가능한 검증 항목이 통과됨:
- ONBD-01, ONBD-02, ONBD-03 모두 실제 코드에서 확인됨
- welcome step 완전 제거 확인
- key links (useTerminalSize → OnboardingScreen → AsciiBanner) 모두 wired
- 커밋 52611d6 실제 파일 변경 확인됨

유일한 미결 항목은 한글 IME 조합 동작으로, 코드 구조(string-width 사용, IMETextInput hook 방식)는 올바르나 런타임 수동 테스트가 필요함.

---

_Verified: 2026-03-21T05:00:00Z_
_Verifier: Claude (gsd-verifier)_
