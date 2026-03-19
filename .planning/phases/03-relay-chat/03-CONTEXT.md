# Phase 3: Relay Chat - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

서버 relay를 통한 1:1 실시간 채팅. 근처 사용자 선택 → 대화 시작, 메시지 교환, 대화 종료. 메시지는 세션 동안만 터미널에 표시, 영구 저장 없음. 그룹 채팅은 Phase 외, 친구 시스템은 Phase 4, P2P 업그레이드는 Phase 5.

</domain>

<decisions>
## Implementation Decisions

### 채팅 시작 흐름
- /users → 화살표 선택 → Enter → 바로 채팅 화면 전환 (요청/수락 없이 내가 시작)
- 한 번에 하나의 대화만 가능 (멀티 대화 없음)
- 대화 종료: /leave 명령어로 현재 대화 나가기 → 메인 화면 복귀

### 수신 요청 처리
- 상대방이 채팅을 시작하면: 팝업 오버레이로 수락/거절 프롬프트
- 수락 → 채팅 화면 전환
- 거절 → 조용히 무시 (요청자에게 알림 없음)

### 메시지 표시 포맷
- 타임스탬프 포함: `[14:23] [Claude Code] coder#3A7F: hello`
- 내 메시지 vs 상대 메시지: 색상으로 구분 (각자의 테마 색상 적용)
- 전송 확인 표시 없음 (체크마크 등 없이 간결하게)

### 알림 동작
- 터미널 벨 (\x07) 사용
- 포커스가 없을 때만 알림 (다른 탭에 있을 때)
- OS 데스크톱 알림 없음 (터미널 벨만)

### 연결 안정성
- 서버 끊김 시: 기존 메시지 화면에 유지 + 시스템 메시지 "연결 끊김" + 입력 비활성화
- 서버 재연결 시: 시스템 메시지 "재연결됨" + 입력 활성화
- 끊긴 동안 전송 시도한 메시지: 유실 (버퍼링/재전송 없음, relay 방식이므로)
- 상대방 오프라인 시: 시스템 메시지 "[nick#tag] went offline" + 채팅창 유지 (자동 나가기 없음)

### Claude's Discretion
- 서버 relay 프로토콜 메시지 설계 (CHAT_REQUEST, CHAT_ACCEPT, CHAT_MESSAGE 등)
- 채팅 세션 관리 방식 (서버 측)
- 팝업 오버레이 UI 디자인
- 입력 비활성화 구현 방식

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project definition
- `.planning/PROJECT.md` — 메시지 비저장 정책, relay-first 전략
- `.planning/REQUIREMENTS.md` — Phase 3 요구사항: MESG-01, MESG-02, MESG-03, SOCL-04

### Research findings
- `.planning/research/ARCHITECTURE.md` — Relay 채팅 데이터 플로우, ConnectionManager 설계
- `.planning/research/PITFALLS.md` — WebSocket 연결 끊김 처리, heartbeat 패턴

### Prior phases
- `.planning/phases/01-foundation/01-CONTEXT.md` — 메시지 포맷 결정, 슬래시 명령어 체계
- `.planning/phases/02-signaling-discovery/02-CONTEXT.md` — 서버 연결 UX, 상태바/시스템 메시지 패턴

### Existing code (확장 대상)
- `packages/shared/src/protocol.ts` — 프로토콜 메시지 타입 (채팅 메시지 추가 필요)
- `packages/server/src/SignalingServer.ts` — 서버 메시지 라우팅 (채팅 relay 핸들러 추가)
- `packages/client/src/network/SignalingClient.ts` — 클라이언트 이벤트 (채팅 이벤트 추가)
- `packages/client/src/hooks/useServerConnection.ts` — 서버 연결 hook (채팅 상태 추가)
- `packages/client/src/ui/screens/ChatScreen.tsx` — 메인 화면 (활성 채팅 상태 통합)
- `packages/client/src/commands/CommandParser.ts` — 명령어 (/leave 추가)

### Project rules
- `CLAUDE.md` — 메시지 저장 금지, protocol-first 원칙
- `.claude/rules/protocol-design.md` — zod 스키마 선행, 메시지 저장 금지
- `.claude/rules/p2p-networking.md` — heartbeat, 재연결 패턴

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SignalingClient` — EventEmitter 기반, 이벤트 추가로 채팅 메시지 수신 처리 가능
- `useServerConnection` hook — 연결 상태 관리, 채팅 상태 확장 가능
- `useNearbyUsers` hook — 패턴 참조하여 useChatSession hook 설계
- `UserList` component — 사용자 선택 UI 이미 구현
- `StatusBar` component — 연결 상태 표시 (채팅 상대 정보 추가)
- `MessageArea` component — 메시지 목록 표시 (ChatMessage 타입으로 확장)
- `IMETextInput` component — 한글 입력 처리 완료

### Established Patterns
- Protocol-first: shared/protocol.ts에 zod 스키마 → 서버/클라이언트 동시 사용
- React hooks: useServerConnection/useNearbyUsers → useChatSession 같은 패턴
- 시스템 메시지: ChatScreen에서 이미 system message 패턴 사용 중
- 오버레이: UserList가 ChatScreen 위에 오버레이되는 패턴 존재

### Integration Points
- `ChatScreen.tsx` — 활성 채팅 상태 관리, 메시지 표시, /leave 처리
- `SignalingServer.ts` — 채팅 메시지 relay 핸들러 추가
- `protocol.ts` — CHAT_REQUEST, CHAT_ACCEPT, CHAT_DECLINE, CHAT_MESSAGE, CHAT_LEAVE 추가

</code_context>

<specifics>
## Specific Ideas

- 타임스탬프 + 뱃지 + 닉네임 + 메시지: `[14:23] [Claude Code] coder#3A7F: hello`
- 내 메시지는 내 테마 색상, 상대 메시지는 상대 테마 색상으로 표시
- 상대방 수신 요청은 팝업 오버레이 (UserList 패턴 재사용)
- 연결 끊김 시 입력 필드 비활성화 + 시스템 메시지 — 재연결 시 자동 활성화

</specifics>

<deferred>
## Deferred Ideas

- 그룹 채팅 — v2 (Phase 외)
- 메시지 전송 확인 (체크마크) — 불필요로 결정
- OS 데스크톱 알림 — 불필요로 결정, 터미널 벨만

</deferred>

---

*Phase: 03-relay-chat*
*Context gathered: 2026-03-19*
