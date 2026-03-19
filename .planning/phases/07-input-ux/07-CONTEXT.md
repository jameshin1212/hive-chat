# Phase 7: Input UX - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

입력 필드에서 커서 이동과 명령어 자동완성이 가능하여 빠르고 편리하게 입력할 수 있도록 한다. 커서 좌/우 이동, `/` 입력 시 명령어 자동완성 목록 표시, 화살표 키로 명령어 선택이 핵심.

</domain>

<decisions>
## Implementation Decisions

### 커서 이동
- 문자 단위 이동만 지원: 좌/우 화살표로 한 문자씩 이동 (단어 단위, Home/End 미지원)
- sliding window에서 커서 위치 추적: 커서가 항상 visible window 안에 보이도록 window가 따라감
- 커서가 중간에 있을 때 문자 입력 시 해당 위치에 삽입 (splice)
- 백스페이스는 커서 왼쪽 문자 삭제

### 자동완성 UI
- 목록 표시 위치: 입력 필드 바로 위 (메시지 영역 하단 일부 가림)
- 선택 항목 하이라이트: inverse (반전) — UserList/FriendList와 동일 패턴
- 각 항목 형식: `/command — description` (명령어 + 설명 함께 표시)
- 입력 텍스트로 필터링: `/u` → `/users` 만 표시

### 자동완성 트리거 및 확정
- 트리거: `/` 문자 입력 즉시 목록 표시, 계속 타이핑하면 필터링
- 확정: Enter로 선택 — 입력 필드에 명령어 텍스트만 채우고 목록 닫음 (즉시 실행 아님)
- 취소: Esc로 목록 닫기, 입력 텍스트 유지
- 선택 이동: 위/아래 화살표로 항목 선택

### Claude's Discretion
- 커서 시각적 표시 스타일 (기존 ▏ 유지 또는 변경)
- 자동완성 목록 최대 표시 개수 (현재 10개 명령어)
- 필터링 시 매칭 없으면 목록 숨기기 vs 빈 목록 표시
- cursorPosition state 관리 방식 (ref vs useState)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 입력 필드
- `packages/client/src/ui/components/IMETextInput.tsx` — 현재 입력 필드. append-only, getVisibleText() sliding window (Phase 6), calcCursorX() 미사용
- `packages/client/src/ui/components/IMETextInput.test.tsx` — 기존 테스트 (getVisibleText 등)

### 명령어 시스템
- `packages/client/src/commands/CommandParser.ts` — COMMANDS 객체 (10개 명령어), parseInput(), isKnownCommand()
- `packages/client/src/ui/screens/ChatScreen.tsx` — handleSubmit()에서 명령어 분기 처리 (L102-205)

### 기존 선택 UI 패턴
- `packages/client/src/ui/components/UserList.tsx` — 화살표 키 선택 + inverse 하이라이트 패턴
- `packages/client/src/ui/components/FriendList.tsx` — 동일 패턴

### TUI 규칙
- `.claude/rules/tui-cjk-input.md` — IME 처리 규칙, 커서 위치 계산

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `COMMANDS` 객체 (CommandParser.ts): 명령어 이름 + description 포함 — 자동완성 데이터 소스
- `getVisibleText()` (IMETextInput.tsx): Phase 6에서 추가된 sliding window — cursorPosition 기반으로 확장 필요
- `calcCursorX()` (IMETextInput.tsx): stringWidth 기반 커서 X 좌표 계산 — 현재 미사용이지만 활용 가능
- `useInput` hook (Ink): 키보드 입력 처리 — left/right arrow 핸들링 추가 가능
- inverse 하이라이트 패턴: UserList/FriendList에서 `inverse={isSelected}` 사용 중

### Established Patterns
- ref 기반 상태 관리: IMETextInput에서 textRef로 React batching 회피 — cursorPosition도 ref 고려
- 화살표 키 선택: UserList/FriendList에서 `key.upArrow`/`key.downArrow` + selectedIndex state
- 오버레이 컴포넌트: UserList/FriendList가 조건부 렌더링으로 표시/숨김

### Integration Points
- `IMETextInput.tsx`: cursorPosition state 추가, left/right arrow 핸들러, 중간 삽입 로직
- `ChatScreen.tsx`: 자동완성 상태 관리, CommandSuggestions 컴포넌트 렌더링 위치 (입력 필드 위)
- `CommandParser.ts`: filterCommands(prefix) 함수 추가

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

*Phase: 07-input-ux*
*Context gathered: 2026-03-20*
