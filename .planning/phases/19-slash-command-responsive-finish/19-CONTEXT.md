# Phase 19: Slash Command & Responsive Finish - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

슬래시 명령어 오버레이를 Claude Code 스타일로 개선하고, 채팅 요청 오버레이에 시각적 강조를 추가하며, 채팅 입력 최소 높이 보장과 StatusBar 반응형 축약을 구현한다.

</domain>

<decisions>
## Implementation Decisions

### 슬래시 명령어 오버레이 (SLSH-01, SLSH-02)
- 기존 CommandSuggestions 컴포넌트를 Claude Code 스타일로 개선
- 명령어명 + 설명이 깔끔하게 정렬 (현재와 유사하지만 더 미려하게)
- Enter 입력 시 선택된 명령어 즉시 실행 (현재 Tab 자동완성 → 수동 Enter 방식에서 개선)
- 현재 ChatScreen에서 suggestion 선택 → input에 채움 → 사용자가 Enter → 실행. 이를 suggestion에서 바로 Enter로 실행하도록 변경

### 채팅 요청 오버레이 (CHAT-01, CHAT-02)
- ChatRequestOverlay에 Box border (single, 색상 강조) 추가
- "Chat request from" 텍스트를 더 눈에 띄게 (bold, 색상)
- 수락/거절 키를 직관적으로 표시 (현재: "Enter to accept, Escape to decline")

### 입력 최소 높이 (RESP-02)
- ChatScreen의 messageAreaHeight 계산에서 입력 영역 최소 높이 보장
- 터미널이 매우 작아도 입력 필드가 가려지지 않도록

### StatusBar 반응형 (RESP-03)
- compact(<80col)에서 StatusBar 정보 축약
- 예: "[AI CLI] nick#tag | connected | 0 nearby" → "nick#tag | connected"
- breakpoint prop으로 조건부 렌더링

### Claude's Discretion
- CommandSuggestions의 정확한 시각 스타일 (border, 색상, padding)
- ChatRequestOverlay border 색상 선택
- StatusBar 축약 시 어떤 정보를 생략할지
- 입력 최소 높이의 구체적 값
- Enter 즉시 실행의 구체적 input 처리 로직

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 기존 코드
- `packages/client/src/ui/components/CommandSuggestions.tsx` — 현재 슬래시 명령어 오버레이 (수정 대상)
- `packages/client/src/ui/components/ChatRequestOverlay.tsx` — 채팅 요청 오버레이 (수정 대상)
- `packages/client/src/ui/components/StatusBar.tsx` — 상태바 (반응형 수정 대상)
- `packages/client/src/ui/screens/ChatScreen.tsx` — 오버레이 통합, messageAreaHeight 계산, suggestion 키 핸들링
- `packages/client/src/commands/CommandParser.ts` — 명령어 파싱 로직

### Phase 16 결과
- `packages/client/src/hooks/useTerminalSize.ts` — breakpoint hook
- `packages/shared/src/constants.ts` — COMPACT_MAX_WIDTH 상수

### TUI 규칙
- `.claude/rules/tui-cjk-input.md` — CJK 문자폭, 터미널 호환성

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `CommandSuggestions` — 이미 스크롤, 선택 하이라이트, ↑↓ indicator 구현. 시각적 개선만 필요
- `useTerminalSize()` — breakpoint 감지, StatusBar에 전달 가능
- `theme` — badge 색상, text 색상 상수

### Established Patterns
- Box borderStyle="single" — OnboardingScreen에서 이미 사용 (Phase 17)
- useInput isActive — 오버레이 활성 시 키 이벤트 격리 패턴

### Integration Points
- `ChatScreen.tsx` — suggestion Enter 핸들링 변경 (현재: input에 채움, 개선: 즉시 실행)
- `ChatScreen.tsx:84` — messageAreaHeight 계산 (입력 최소 높이 보장)
- `StatusBar` — breakpoint prop 추가, compact 렌더링 분기

</code_context>

<specifics>
## Specific Ideas

- Claude Code의 슬래시 명령어 UI 참고: 명령어명이 좌측 정렬, 설명이 우측에 dimColor로 표시
- 채팅 요청 오버레이가 시각적으로 "알림" 느낌 — Box border + 색상으로 즉시 인지 가능

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 19-slash-command-responsive-finish*
*Context gathered: 2026-03-21*
