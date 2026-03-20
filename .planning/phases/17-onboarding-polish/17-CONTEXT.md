# Phase 17: Onboarding Polish - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

첫 실행 사용자의 온보딩 플로우를 개선한다: welcome+nickname step 통합, step indicator 추가, Box border 시각 개선, 터미널 폭에 따른 ASCII 배너 적응형 표시.

</domain>

<decisions>
## Implementation Decisions

### 온보딩 플로우
- welcome step과 nickname step을 통합 — 배너 아래 바로 닉네임 입력 (별도 'Press Enter' 단계 제거)
- 총 2 step: Step 1 (닉네임 입력 + 배너) → Step 2 (AI CLI 선택)
- step 상태: 'nickname' | 'ai-cli' (기존 'welcome' step 제거)

### Step Indicator
- 배너 아래에 "Step 1/2", "Step 2/2" 텍스트 형태로 표시
- 간결한 텍스트 스타일 (도트나 프로그레스 바 아님)

### Box Border
- 입력 영역에 single border (┌───┐) 적용
- border 색상: theme.text.info (cyan)
- 닉네임 입력과 AI CLI 선택 모두 Box로 감싸기

### 배너 적응형 동작
- standard/wide (>=80col): figlet 'Standard' 폰트 배너 (현재와 동일)
- compact (<80col): plain text fallback ('=== HIVECHAT ===' 등)
- 매우 좁은 터미널 (<60col): Claude's Discretion

### Claude's Discretion
- 매우 좁은 터미널(<60col)에서 배너 표시 방식 (plain text 유지 or 숨김)
- Box 내부 padding 크기
- 에러 메시지 스타일
- step 전환 시 시각적 전환 효과 유무

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### TUI 규칙
- `.claude/rules/tui-cjk-input.md` — IME 처리 규칙, 한글 조합 테스트 필수
- `.claude/rules/monorepo-conventions.md` — ESM-only, import 규칙

### Phase 16 결과
- `packages/client/src/hooks/useTerminalSize.ts` — breakpoint hook (compact/standard/wide)
- `packages/shared/src/constants.ts` — COMPACT_MAX_WIDTH, WIDE_MIN_WIDTH 상수

### 기존 코드
- `packages/client/src/ui/screens/OnboardingScreen.tsx` — 현재 온보딩 화면 (수정 대상)
- `packages/client/src/ui/components/AsciiBanner.tsx` — figlet 배너 컴포넌트 (적응형 수정 대상)
- `packages/client/src/ui/components/AiCliSelector.tsx` — AI CLI 선택기 (isActive 이미 적용)
- `packages/client/src/ui/components/IMETextInput.tsx` — 텍스트 입력 (한글 IME 지원)
- `packages/client/src/ui/theme.ts` — 색상/스타일 상수

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useTerminalSize` hook: breakpoint 감지에 사용, AsciiBanner에 breakpoint prop 전달
- `IMETextInput`: 기존 닉네임 입력에 이미 사용 중, 한글 IME 안전
- `AiCliSelector`: isActive prop 이미 적용 (Phase 16)
- `theme.text.info`: cyan 색상 — Box border에 사용

### Established Patterns
- Ink `<Box borderStyle="single">` — 기존 SettingsOverlay에서 사용된 패턴
- `useTerminalSize()` — ChatScreen에서 사용 중, OnboardingScreen에도 동일 패턴 적용

### Integration Points
- `OnboardingScreen.tsx` — step 통합, indicator 추가, Box 적용
- `AsciiBanner.tsx` — breakpoint prop 받아서 적응형 렌더링
- `App.tsx` — OnboardingScreen 호출 지점 (변경 불필요)

</code_context>

<specifics>
## Specific Ideas

No specific requirements — 온보딩 flow 통합과 시각 개선에 집중. Claude Code의 깔끔한 초기 설정 경험을 참고.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 17-onboarding-polish*
*Context gathered: 2026-03-21*
