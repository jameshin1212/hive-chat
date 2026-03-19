# Phase 6: Chat Bug Fixes - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

채팅 중 입력 텍스트가 사라지거나 메시지 영역이 깨지는 문제를 해결하여 안정적으로 대화할 수 있도록 한다. 입력 필드 오버플로우, 메시지 스크롤 메커니즘 부재, 메시지 버퍼 메모리 누수를 수정한다.

</domain>

<decisions>
## Implementation Decisions

### 긴 입력 텍스트 처리
- 수평 스크롤 방식: 입력 필드는 항상 1줄 고정, 커서 근처 텍스트만 보이는 sliding window
- 커서 우측 고정: 타이핑 시 커서는 항상 끝에 위치, 텍스트가 좌로 흐름
- 길이 표시 안 함: 채팅이라 길이 제한 불필요, 깨끗한 UI 유지
- 가용 폭 계산: `columns - stringWidth(PROMPT) - 1`(커서 공간)으로 visible window 크기 결정

### 메시지 스크롤
- 자동 + 수동 스크롤: 기본 최신 메시지 하단 표시 + Page Up/Down으로 이전 메시지 탐색
- 스크롤 중 새 메시지 도착 시: 위치 유지 + `↓ new messages` 알림 표시
- 스크롤 인디케이터: Claude's Discretion

### 메시지 버퍼 관리
- MAX_MESSAGES=500 유지, parent state(ChatScreen)도 500개로 제한하여 메모리 누수 방지
- 화면 표시 라인 수: `rows - 4`(상태바 1 + 구분선 2 + 입력 1) — 접힘 라인 고려하여 계산
- 터미널 리사이즈 시 visible 라인 수 재계산

### Claude's Discretion
- 스크롤 인디케이터 디자인 및 위치
- Page Up/Down 스크롤 단위(한 페이지 or 반 페이지)
- 메시지 wrap 시 여러 라인 차지하는 경우의 visible 계산 방식

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 입력 필드
- `packages/client/src/ui/components/IMETextInput.tsx` — 현재 입력 필드 구현. 한글 IME ref 기반 처리, calcCursorX() 미사용 상태
- `packages/client/src/ui/components/IMETextInput.test.tsx` — 기존 테스트 (cursor width 등)

### 메시지 영역
- `packages/client/src/ui/components/MessageArea.tsx` — 현재 메시지 렌더링. overflow="hidden", 스크롤 미지원
- `packages/client/src/ui/screens/ChatScreen.tsx` — 메인 레이아웃 orchestrator. 메시지 state 관리, 레이아웃 구조

### 공유 상수
- `packages/shared/src/constants.ts` — MAX_MESSAGES=500, DEFAULT_TERMINAL_WIDTH=80

### TUI 규칙
- `.claude/rules/tui-cjk-input.md` — IME 처리 규칙, 문자열 폭 계산 규칙

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `IMETextInput.tsx:calcCursorX()`: stringWidth 기반 커서 X 좌표 계산 함수 — 현재 미사용이지만 sliding window 구현에 활용 가능
- `string-width` 패키지: 이미 의존성에 포함, CJK 2-column 폭 계산 지원
- `useInput` hook (Ink): 현재 IMETextInput에서 키보드 입력 처리에 사용 중

### Established Patterns
- Ink `<Box flexGrow={1} overflow="hidden">`: MessageArea에서 사용 중이나 스크롤 미지원
- `process.stdout` rows/columns 추적: ChatScreen에서 `useStdout()` + `useState` + resize 이벤트로 구현
- ref 기반 상태 관리: IMETextInput에서 React batching 회피를 위해 textRef 사용

### Integration Points
- `ChatScreen.tsx:L202` — `setMessages(prev => [...prev, msg])`: 메시지 추가 지점. 여기서 500개 제한 적용 필요
- `ChatScreen.tsx:L224-281` — 레이아웃 구조: StatusBar → separator → MessageArea → separator → IMETextInput
- `MessageArea.tsx:L36` — `messages.slice(-MAX_MESSAGES)`: 현재 visible 계산. 터미널 높이 기반으로 변경 필요

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-chat-bug-fixes*
*Context gathered: 2026-03-20*
