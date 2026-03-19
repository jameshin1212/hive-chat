# Phase 8: Visual Polish - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

메시지와 UI 요소의 시각적 구분이 명확하여 채팅 내용을 한눈에 파악할 수 있도록 한다. 상태바 재배치, 시스템 메시지 스타일 구분, 메시지 본문 색상 구분, /quit → /exit 변경.

</domain>

<decisions>
## Implementation Decisions

### 시스템 메시지 스타일
- 간결 포맷: 배지/닉네임 제거, 회색 이탤릭 텍스트만. 예: `─ Connected to server ─`
- 타임스탬프 미포함: 시스템 메시지는 이벤트 알림이라 시간 불필요
- MessageArea에서 `from.nickname === 'system'` 조건으로 분기 렌더링

### 메시지 본문 색상 구분
- 내 메시지 본문: green (닉네임과 동일 톤)
- 상대방 메시지 본문: 기본 흰색 (현재 유지)
- 닉네임 색상: 기존 유지 (나=green, 상대=USER_COLORS 순환)
- MessageArea에서 `isOwnMessage` 판별하여 content 색상 적용

### 상태바 재배치
- 새 레이아웃 순서: MessageArea → separator → StatusBar → separator → Input
- 구분선 2개 유지 (상태바 위아래)
- messageAreaHeight 계산은 기존과 동일: `rows - 4`
- CommandSuggestions는 입력 필드 위 = 상태바 위에 표시

### /quit → /exit 변경
- CommandParser의 `/quit` → `/exit`로 이름 변경
- ChatScreen의 핸들러에서 `parsed.name === '/exit'` 로 변경
- `/help` 출력에서도 반영

### Claude's Discretion
- 시스템 메시지 구분선 문자 (─ 또는 다른 기호)
- CommandSuggestions 렌더링 위치 조정 (상태바 이동에 따른)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 레이아웃
- `packages/client/src/ui/screens/ChatScreen.tsx` — 메인 레이아웃. 현재 StatusBar 위치(L270-279), 메시지 영역 높이 계산, CommandSuggestions 위치
- `packages/client/src/ui/components/StatusBar.tsx` — 상태바 컴포넌트 구현

### 메시지 렌더링
- `packages/client/src/ui/components/MessageArea.tsx` — 메시지 렌더링 로직. 시스템 메시지 분기 추가 위치 (L97-116)
- `packages/client/src/ui/theme.ts` — 색상 정의. text.primary=green, text.secondary=gray

### 명령어
- `packages/client/src/commands/CommandParser.ts` — COMMANDS 객체에서 /quit → /exit 변경

### 공유 상수
- `packages/shared/src/constants.ts` — USER_COLORS 배열

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `theme.ts`: text.secondary('gray')를 시스템 메시지 색상으로 활용 가능
- `theme.ts`: text.primary('green')가 이미 내 메시지 닉네임 색상 — 본문에도 동일 적용
- ChatScreen L62-68: 시스템 메시지 생성 패턴 (`from.nickname === 'system'`)

### Established Patterns
- MessageArea에서 `isOwnMessage` 판별: `msg.from.nickname === identity.nickname && msg.from.tag === identity.tag`
- Box flexDirection="column" 기반 레이아웃

### Integration Points
- ChatScreen 렌더 JSX (L268-339): StatusBar 위치 이동, CommandSuggestions 위치 조정
- MessageArea 렌더링 (L97-116): system 메시지 분기 + content 색상 분기
- CommandParser COMMANDS 객체: /quit → /exit

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

*Phase: 08-visual-polish*
*Context gathered: 2026-03-20*
