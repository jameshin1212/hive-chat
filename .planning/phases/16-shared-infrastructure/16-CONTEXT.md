# Phase 16: Shared Infrastructure - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

나머지 모든 UI 작업(Phase 17-19)의 기반이 되는 공유 인프라 구축: useTerminalSize hook, useInput isActive 키 충돌 수정, 빌드타임 버전 주입, breakpoint 시스템.

</domain>

<decisions>
## Implementation Decisions

### Breakpoint 시스템
- compact(<80) / standard(80-120) / wide(>120) 3단계
- 최소 지원 터미널 폭: 60 columns (CLAUDE.md 규칙)
- breakpoint는 columns 기준, rows는 별도 전달 (messageAreaHeight 등에 사용)

### useTerminalSize hook
- `useStdout()`에서 rows/columns 추출 + resize 감지
- 반환값: `{ rows, columns, breakpoint }` — breakpoint는 'compact' | 'standard' | 'wide'
- undefined 시 기본값: rows=24, columns=80 (CLAUDE.md 규칙)

### useInput isActive 수정
- `AiCliSelector.tsx:13` — useInput에 isActive 미사용, 키 이벤트 충돌 버그
- isActive prop 추가하여 활성 상태일 때만 키 이벤트 처리
- OnboardingScreen에서 AiCliSelector가 마운트될 때만 활성화

### 버전 빌드타임 주입
- tsdown.config.ts에 `define: { '__APP_VERSION__': JSON.stringify(pkg.version) }` 추가
- `ChatScreen.tsx:116`의 하드코딩 `v0.1.0` 제거 → `__APP_VERSION__` 사용
- TypeScript declare 추가: `declare const __APP_VERSION__: string`

### Claude's Discretion
- Hook 내부 구현 세부사항 (debounce, memoization 등)
- magic number `rows - 4` 리팩토링 접근 방식
- breakpoint 변경 시 transition 처리 (즉시 vs debounced)
- 테스트 전략 (unit test 범위)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### TUI 규칙
- `.claude/rules/tui-cjk-input.md` — IME 처리 규칙, 터미널 호환성, 문자열 폭 계산
- `.claude/rules/monorepo-conventions.md` — ESM-only, import 규칙, 패키지 구조

### 리서치 결과
- `.planning/research/STACK.md` — 기존 stack 분석, Ink resize 동작, figlet 활용
- `.planning/research/ARCHITECTURE.md` — 컴포넌트 통합 전략, useTerminalSize 설계
- `.planning/research/PITFALLS.md` — useInput isActive 누락, IME re-render 민감성

### 기존 코드
- `packages/client/src/ui/screens/ChatScreen.tsx` — useStdout 사용 패턴, rows-4 magic number
- `packages/client/src/ui/components/AiCliSelector.tsx` — isActive 누락 버그
- `packages/client/tsdown.config.ts` — 빌드 설정, define 옵션 추가 지점

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useStdout()` (Ink built-in): ChatScreen에서 이미 사용 중, 터미널 크기 제공
- `theme.ts`: 색상/스타일 상수 관리 — breakpoint 상수도 여기에 추가 가능
- `@hivechat/shared` constants: `DEFAULT_TERMINAL_WIDTH = 80` 이미 정의

### Established Patterns
- Ink `useInput` + `isActive` 패턴: UserList, FriendList, SettingsOverlay에서 일관 사용
- `ChatScreen.tsx:84` — `rows - 4 - overlayHeight`로 메시지 영역 높이 계산 (magic number)

### Integration Points
- `ChatScreen.tsx:42-44` — useStdout → useTerminalSize로 교체
- `ChatScreen.tsx:84` — magic number를 breakpoint 기반 계산으로 리팩토링
- `AiCliSelector.tsx:13` — useInput에 isActive prop 추가
- `tsdown.config.ts` — define 옵션 추가
- `ChatScreen.tsx:116` — __APP_VERSION__ 상수 사용

</code_context>

<specifics>
## Specific Ideas

No specific requirements — 사용자가 인프라 영역을 Claude에게 전적으로 위임. 기술적으로 최선의 접근 방식 선택 가능.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 16-shared-infrastructure*
*Context gathered: 2026-03-21*
