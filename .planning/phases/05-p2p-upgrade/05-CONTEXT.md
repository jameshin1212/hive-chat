# Phase 5: P2P Upgrade - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Hyperswarm을 사용한 P2P 직접 연결 업그레이드. 채팅 시작 시 relay로 즉시 연결 후 백그라운드에서 P2P 시도, 성공 시 자동 전환. NAT traversal 실패 시 relay fallback 유지. ConnectionManager로 transport 추상화하여 TUI에 투명. 그룹 채팅은 v2, 서버 배포는 Phase 완료 후 별도 작업.

</domain>

<decisions>
## Implementation Decisions

### P2P 연결 시도 UX
- 채팅 시작 시 relay로 즉시 연결 (대기 없음)
- 백그라운드에서 P2P 연결 시도, 성공 시 자동 전환
- P2P 연결 중 상태: StatusBar만 변경 (메시지 영역에 시스템 메시지 없음)
- P2P 실패 시: StatusBar가 relay 상태 유지 (별도 알림 없음)
- 근처 사용자와 친구 모두 동일 전략 (P2P 시도 → relay fallback)

### 실시간 연결 전환
- relay 채팅 중 백그라운드 P2P 업그레이드 시도 (성공 시 자동 전환)
- P2P → relay 다운그레이드: 자동 전환, StatusBar만 변경 (시스템 메시지 없음)
- 전환 중 메시지 유실 허용 (현재 relay 방식과 동일 정책)
- 양쪽 사용자의 연결 방식은 항상 동일 (양쪽 모두 P2P 또는 양쪽 모두 relay)

### 원격 친구 P2P 연결
- 신호 서버가 양쪽에 상대방의 Hyperswarm topic/key 전달 (서버 중개 방식)
- P2P handshake 시 nick#tag 교환으로 상대방 확인 (암호학적 검증 없음)
- 양쪽 모두 서버 접속 상태에서만 채팅 가능 (P2P 성공 시에도 서버 연결 유지)
- Hyperswarm 연결 시도 타임아웃: 3초 (실패 시 relay 유지)

### Connection Status 표시 (TUI-03)
- 색상으로 transport 타입 구분:
  - direct (P2P): 초록색 `connected`
  - relay: 노란색 `connected`
  - disconnected: 빨간색 `offline`
- 텍스트는 기존 'connected' 유지, 색상만 변경
- 전환 시 즉시 변경 (애니메이션/깜빡임 없음)

### Claude's Discretion
- ConnectionManager 내부 설계 (transport 추상화 구조)
- Hyperswarm topic 생성 방식 (session ID 기반 등)
- P2P binary 프로토콜 설계 (JSON vs binary 선택)
- 서버 측 P2P 중개 메시지 타입 설계
- P2P 연결 상태 모니터링 방식
- 백그라운드 P2P 업그레이드 시도 타이밍

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project definition
- `.planning/PROJECT.md` — 프로젝트 비전, relay-first 전략, P2P 하이브리드 구조
- `.planning/REQUIREMENTS.md` — Phase 5 요구사항: TUI-03, SOCL-03

### Research findings
- `.planning/research/ARCHITECTURE.md` — ConnectionManager 설계, P2P 업그레이드 데이터 플로우
- `.planning/research/STACK.md` — Hyperswarm 기술 스택
- `.planning/research/PITFALLS.md` — NAT traversal 실패율, Hyperswarm 주의점

### Prior phases
- `.planning/phases/03-relay-chat/03-CONTEXT.md` — 채팅 시작 흐름, 연결 안정성 결정
- `.planning/phases/04-friends/04-CONTEXT.md` — 친구 상태 조회, 서버 중개 패턴

### Existing code (확장 대상)
- `packages/client/src/network/SignalingClient.ts` — WebSocket 클라이언트 (ConnectionManager 래핑 대상)
- `packages/client/src/hooks/useChatSession.ts` — transport-agnostic hook (이벤트 기반)
- `packages/client/src/hooks/useServerConnection.ts` — 서버 연결 hook
- `packages/client/src/ui/components/StatusBar.tsx` — 연결 상태 표시 (색상 구분 추가)
- `packages/client/src/ui/screens/ChatScreen.tsx` — 채팅 화면 (ConnectionManager 통합)
- `packages/server/src/SignalingServer.ts` — P2P 중개 메시지 핸들러 추가
- `packages/server/src/ChatSessionManager.ts` — 세션 관리 (P2P 상태 추가)
- `packages/shared/src/protocol.ts` — P2P 중개 프로토콜 메시지 추가

### Project rules
- `CLAUDE.md` — ConnectionManager 추상화, relay-first, P2P Phase 5
- `.claude/rules/p2p-networking.md` — NAT traversal, heartbeat, 재연결, IP 보안
- `.claude/rules/protocol-design.md` — protocol-first, zod 스키마, binary 메시지

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SignalingClient` — EventEmitter 기반, ConnectionManager로 래핑하여 transport 추상화 가능
- `useChatSession` hook — transport-agnostic (이벤트만 의존), P2P 전환 시 수정 불필요
- `ChatSessionManager` (서버) — sessionId 기반 세션 관리, P2P 상태 필드 추가만 필요
- `StatusBar` — connectionStatus prop 확장하여 transport 색상 구분
- `protocol.ts` — zod 스키마 패턴 확립, P2P 중개 메시지 추가 용이

### Established Patterns
- Protocol-first: shared/protocol.ts에 zod 스키마 → 서버/클라이언트 동시 사용
- EventEmitter: SignalingClient → useChatSession → ChatScreen 이벤트 체인
- Hook 패턴: useServerConnection/useNearbyUsers/useChatSession/useFriends
- 재연결: exponential backoff + jitter (500ms → 30s cap)

### Integration Points
- `SignalingClient.ts` → ConnectionManager로 래핑 (기존 API 유지)
- `StatusBar.tsx` → transportType prop 추가, 색상 조건 분기
- `SignalingServer.ts` → P2P_OFFER/P2P_ANSWER 메시지 핸들러 추가
- `ChatSessionManager.ts` → transportType 필드 추가 (relay/direct)
- `protocol.ts` → P2P 중개 프로토콜 메시지 스키마 추가

### Key Gap
- ConnectionManager 클래스가 아직 없음 — Phase 5의 핵심 작업
- Hyperswarm 미설치 — 의존성 추가 필요 (native binary 없음 확인 필수)

</code_context>

<specifics>
## Specific Ideas

- relay로 즉시 연결 → 백그라운드 P2P 시도 → 성공 시 색상만 바뀜 (사용자 시점에서 seamless)
- StatusBar 색상: direct=초록, relay=노랑, offline=빨강 — 현재 connected는 항상 초록이었으므로 relay 시 노랑으로 변경
- 서버가 Hyperswarm topic을 양쪽에 전달하는 P2P_OFFER/P2P_ANSWER 프로토콜
- 3초 P2P 타임아웃 — 사용자 대기 최소화
- useChatSession hook은 이미 transport-agnostic — ConnectionManager만 추가하면 동작

</specifics>

<deferred>
## Deferred Ideas

- 서버 배포 (Fly.io) — 모든 Phase 완료 후 별도 작업
- E2E 암호화 — v1 out of scope (P2P 직접 연결이 transport security 제공)
- P2P 전용 모드 (서버 없이 채팅) — 서버 접속 필수로 결정
- 그룹 채팅 P2P — v2 scope
- TUI 개선 3건 (커서 이동, 커맨드 자동완성, 상태바 위치) — 별도 phase

</deferred>

---

*Phase: 05-p2p-upgrade*
*Context gathered: 2026-03-19*
