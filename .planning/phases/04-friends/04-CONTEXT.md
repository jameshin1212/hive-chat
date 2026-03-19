# Phase 4: Friends - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

nick#tag으로 위치 무관 친구추가/삭제 + persistent 친구 목록. 친구의 온라인/오프라인 상태 표시. P2P 직접 연결은 Phase 5, 그룹 채팅은 v2 scope.

</domain>

<decisions>
## Implementation Decisions

### 친구 추가 모델
- 일방적 추가 (Twitter follow 방식) — 상대방 수락 불필요
- 내가 nick#tag을 알고 있으면 바로 친구 목록에 추가
- 상대방에게 "누가 나를 추가했다" 알림 없음 (프라이버시)
- 이유: 캐주얼/실험 프로젝트 성격에 부합, 구현 단순, 프라이버시 보장

### 친구 목록 UI
- `/friends` 명령어로 오버레이 표시 (UserList와 동일 패턴)
- 표시 정보: nick#tag | [AI CLI badge] | [online/offline] 상태
- 정렬: online 먼저 → offline, 각 그룹 내 알파벳순
- 화살표 선택 → Enter로 채팅 시작 (online인 친구만 가능)
- offline 친구 선택 시: "Currently offline" 시스템 메시지
- 빈 상태: "No friends yet. Use /addfriend nick#tag" 안내 메시지

### 친구 상태 조회
- 클라이언트가 서버에 등록 시 친구 목록(nick#tag 배열)도 전송
- 서버가 친구의 online/offline 상태를 추적하여 실시간 업데이트 전송
- 친구가 서버에 접속한 적 없으면: unknown 상태로 표시
- 서버에 친구 목록 저장 금지 — 매 세션 클라이언트가 전송

### 명령어 설계
- `/friends` — 친구 목록 오버레이 표시
- `/addfriend <nick#tag>` — 친구 추가
- `/removefriend <nick#tag>` — 친구 삭제
- `/addfriend` 인자 없으면: 사용법 안내 시스템 메시지
- 잘못된 nick#tag 형식: "Invalid format. Use: nick#TAG" 에러 메시지
- 이미 친구인 경우: "Already in friend list" 메시지
- 자기 자신 추가 시도: "Cannot add yourself" 메시지

### 로컬 저장
- `conf` 라이브러리 (AppConfig) 확장하여 friends 배열 저장
- 저장 형식: `{ nickname: string; tag: string; addedAt: string }[]`
- CLING_TALK_PROFILE 환경변수로 테스트 프로필 분리 지원

### 상태바 표시
- 기존 상태바에 온라인 친구 수 추가: `Friends: 2/5 online`
- 친구가 0명이면 표시 생략

### Claude's Discretion
- 프로토콜 메시지 타입 설계 (FRIEND_STATUS_REQUEST, FRIEND_STATUS_UPDATE 등)
- 서버 측 친구 상태 조회 구현 세부사항
- FriendList 컴포넌트 내부 UI 디자인
- 친구 상태 업데이트 주기/이벤트 방식
- 입력 검증 세부 로직

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project definition
- `.planning/PROJECT.md` — 친구 시스템 요구사항, 프라이버시 정책
- `.planning/REQUIREMENTS.md` — Phase 4 요구사항: SOCL-01, SOCL-02

### Research findings
- `.planning/research/ARCHITECTURE.md` — 클라이언트-서버 통신 패턴
- `.planning/research/PITFALLS.md` — WebSocket 연결 관리 주의점

### Prior phases
- `.planning/phases/01-foundation/01-CONTEXT.md` — TUI 레이아웃, 슬래시 명령어 체계, 색상 스키마
- `.planning/phases/02-signaling-discovery/02-CONTEXT.md` — 서버 연결 UX, presence 동작
- `.planning/phases/03-relay-chat/03-CONTEXT.md` — 채팅 시작 흐름, 오버레이 패턴

### Existing code (확장 대상)
- `packages/shared/src/protocol.ts` — 프로토콜 메시지 타입 (친구 상태 메시지 추가)
- `packages/shared/src/types.ts` — Identity 타입 (FriendRecord 타입 추가)
- `packages/client/src/config/AppConfig.ts` — conf 저장소 (friends 필드 확장)
- `packages/client/src/commands/CommandParser.ts` — 명령어 파서 (/addfriend, /removefriend 추가)
- `packages/client/src/ui/screens/ChatScreen.tsx` — 화면 상태 관리 (FriendList 오버레이 추가)
- `packages/client/src/ui/components/UserList.tsx` — 참조 패턴 (FriendList 컴포넌트)
- `packages/client/src/ui/components/StatusBar.tsx` — 온라인 친구 수 표시 추가
- `packages/client/src/network/SignalingClient.ts` — 친구 상태 이벤트 추가
- `packages/server/src/PresenceManager.ts` — 사용자 조회 (친구 상태 확인용)
- `packages/server/src/SignalingServer.ts` — 친구 상태 요청 핸들러 추가

### Project rules
- `CLAUDE.md` — protocol-first 원칙, 메시지 저장 금지
- `.claude/rules/protocol-design.md` — zod 스키마 선행, 메시지 저장 금지
- `.claude/rules/monorepo-conventions.md` — import 규칙, ESM-only

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `UserList` component — 오버레이 UI 패턴, 화살표 네비게이션, Enter 선택
- `useNearbyUsers` hook — 서버 데이터 구독 패턴 (useFriends hook 참조)
- `useChatSession` hook — 서버 이벤트 구독 패턴
- `SignalingClient` — EventEmitter 기반 이벤트 추가 패턴 확립
- `CommandParser` — COMMANDS 객체에 `/friends` 이미 등록 (placeholder)
- `AppConfig` — conf 라이브러리 사용 패턴 (Identity 저장)
- `ChatRequestOverlay` — 오버레이 UI 패턴 참조

### Established Patterns
- Protocol-first: shared/protocol.ts에 zod 스키마 → 서버/클라이언트 동시 사용
- React hooks: useServerConnection/useNearbyUsers/useChatSession 패턴
- 오버레이: UserList/ChatRequestOverlay가 ChatScreen 위에 렌더링
- 시스템 메시지: addSystemMessage 패턴으로 안내/에러 표시
- CommandParser: COMMANDS 객체 + parseInput() → ChatScreen handleSubmit 라우팅

### Integration Points
- `ChatScreen.tsx` — showFriendList 상태 + /friends, /addfriend, /removefriend 라우팅
- `SignalingClient.ts` — friend_status 이벤트 emit
- `SignalingServer.ts` — friend_status_request 핸들러
- `PresenceManager.ts` — getUserByIdentity(nick, tag) 조회 메서드
- `protocol.ts` — FRIEND_STATUS_REQUEST, FRIEND_STATUS_UPDATE 메시지 타입
- `AppConfig.ts` — friends 필드 추가

</code_context>

<specifics>
## Specific Ideas

- FriendList는 UserList와 동일한 테이블 형식: nick#tag | [AI CLI] | [status]
- online 친구는 초록색 [online], offline은 회색 [offline]
- `/addfriend coder#3A7F` → "Added coder#3A7F to friends" 시스템 메시지
- 상태바: `👥 2/5` (온라인/전체 친구) — 이모지 대신 `Friends: 2/5` 텍스트
- 친구 목록에서 online 친구 선택 → 바로 채팅 요청 (Phase 3 chat flow 재사용)

</specifics>

<deferred>
## Deferred Ideas

- 원격 친구 P2P 직접 연결 — Phase 5 (SOCL-03)
- 친구 요청/수락 양방향 모델 — 현재 불필요, 추후 사용자 피드백에 따라
- 친구 그룹/카테고리 — v2 scope
- 친구 닉네임 변경 감지 — nick은 변경 가능하나 tag은 불변, tag 기준 추적 고려

</deferred>

---

*Phase: 04-friends*
*Context gathered: 2026-03-19*
*Mode: --auto (recommended defaults applied)*
