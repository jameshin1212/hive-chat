# Phase 18: Welcome Section - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

메인 채팅 화면(lobby) 진입 시 ASCII 배너, 프로필 카드, Tips를 시스템 메시지로 표시한다. 메시지가 쌓이면 자연스럽게 스크롤 아웃된다. 기존 App.tsx WelcomeBack splash를 제거한다.

</domain>

<decisions>
## Implementation Decisions

### 구현 방식
- 별도 WelcomeSection 컴포넌트가 아닌, 시스템 메시지로 MessageArea에 삽입
- 기존 ChatScreen.tsx의 connected 이벤트 핸들러에서 환영 콘텐츠를 시스템 메시지로 추가
- 스크롤 아웃으로 자연스럽게 dismiss (별도 dismiss 로직 불필요)

### 웰컴 콘텐츠 (시스템 메시지 순서)
1. ASCII 아트 배너 (figlet, breakpoint에 따라 적응형 — AsciiBanner 로직 재사용)
2. 프로필 카드: 닉네임#태그, AI CLI, 연결 상태 (connected/offline)
3. 버전 표시: HiveChat v{__APP_VERSION__}
4. Tips: 사용법 안내

### 프로필 카드
- 닉네임#태그 + AI CLI 뱃지 + 연결 상태
- 기존 ChatScreen.tsx:115-116의 하드코딩 시스템 메시지를 교체

### App.tsx WelcomeBack splash 제거
- 기존 setTimeout 기반 WelcomeBack 제거
- 웰컴 정보가 시스템 메시지로 이동했으므로 불필요

### Claude's Discretion
- ASCII 배너의 시스템 메시지 포맷팅 (색상, 정렬)
- Tips 내용 구성
- 프로필 카드 시각적 포맷
- 좁은 터미널에서 배너 생략 여부

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 기존 코드
- `packages/client/src/ui/screens/ChatScreen.tsx` — connected 이벤트 핸들러 (line 112-116), 시스템 메시지 추가 패턴
- `packages/client/src/ui/components/AsciiBanner.tsx` — figlet 배너 + breakpoint 적응형
- `packages/client/src/ui/components/MessageArea.tsx` — 메시지 렌더링, 시스템 메시지 스타일
- `packages/client/src/App.tsx` — WelcomeBack splash (제거 대상)

### Phase 16 결과
- `packages/client/src/hooks/useTerminalSize.ts` — breakpoint hook
- `packages/client/src/globals.d.ts` — __APP_VERSION__ 선언

### TUI 규칙
- `.claude/rules/tui-cjk-input.md` — CJK 문자폭 계산

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `addSystemMessage()` — ChatScreen 내 시스템 메시지 추가 함수, 웰컴 콘텐츠에 직접 사용
- `AsciiBanner` 컴포넌트의 figlet 텍스트 생성 로직 — 문자열로 추출하여 시스템 메시지에 삽입 가능
- `theme.badge[aiCli]` — AI CLI 뱃지 색상
- `__APP_VERSION__` — 빌드타임 버전 상수

### Established Patterns
- 시스템 메시지 kind='transition' — 시각적으로 구분되는 메시지 (구분선 포함)
- ChatScreen connected 핸들러 — 연결 시 메시지 추가하는 기존 패턴

### Integration Points
- `ChatScreen.tsx:112-116` — connected 핸들러에서 기존 시스템 메시지를 웰컴 콘텐츠로 교체
- `App.tsx` — WelcomeBack splash 제거
- `MessageArea.tsx` — 시스템 메시지 렌더링 (ASCII 아트가 여러 줄이면 렌더링 확인 필요)

</code_context>

<specifics>
## Specific Ideas

- Claude Code의 메인 화면처럼 배너 + 프로필 정보 + Tips가 상단에 표시
- 시스템 메시지로 구현하여 채팅 메시지가 쌓이면 자연스럽게 위로 스크롤됨
- 기존 "Connected" + "HiveChat v..." + "Tips: ..." 3줄 시스템 메시지를 더 풍부한 웰컴 콘텐츠로 교체

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 18-welcome-section*
*Context gathered: 2026-03-21*
