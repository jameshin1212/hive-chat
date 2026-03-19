# Architecture Research

**Domain:** CLI P2P Chat with Location-Based Discovery
**Researched:** 2026-03-19
**Confidence:** MEDIUM

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                       CLI Client (TUI)                          │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌────────────┐  │
│  │  UI Layer  │  │  Chat     │  │  Identity  │  │  Friend    │  │
│  │  (Ink/     │  │  Manager  │  │  Manager   │  │  Manager   │  │
│  │  Blessed)  │  │           │  │            │  │            │  │
│  └─────┬─────┘  └─────┬─────┘  └─────┬──────┘  └─────┬──────┘  │
│        │              │              │               │          │
│  ┌─────┴──────────────┴──────────────┴───────────────┴──────┐  │
│  │                   Connection Manager                      │  │
│  │         (P2P + Signaling Server Client)                   │  │
│  └──────────────┬────────────────────┬───────────────────────┘  │
│                 │                    │                           │
└─────────────────┼────────────────────┼───────────────────────────┘
                  │ WebSocket          │ P2P (WebRTC DataChannel
                  │ (signaling)        │  or relay fallback)
                  │                    │
┌─────────────────┼────────────────────┼───────────────────────────┐
│          Signaling Server            │                           │
│  ┌──────────────┴──────────┐   ┌─────┴──────────┐               │
│  │  Presence & Discovery   │   │  Message Relay  │               │
│  │  - User registration    │   │  (fallback only │               │
│  │  - Location matching    │   │   when P2P      │               │
│  │  - SDP/ICE exchange     │   │   fails)        │               │
│  │  - Online status        │   │                 │               │
│  └─────────────────────────┘   └─────────────────┘               │
│                                                                  │
│  ┌──────────────────────┐                                        │
│  │  IP Geolocation      │ ← External API (ip-api.com)           │
│  │  (server-side lookup)│                                        │
│  └──────────────────────┘                                        │
└──────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **TUI Layer** | 터미널 UI 렌더링, 키 입력 처리, 채팅 화면/사용자 목록 표시 | Ink (React for CLI) 또는 Blessed |
| **Chat Manager** | 메시지 송수신 조율, 채팅 세션 관리 (1:1, 그룹) | EventEmitter 기반 상태 머신 |
| **Identity Manager** | 닉네임#태그 생성/저장, 최초 실행 설정 | 로컬 JSON 파일 (~/.double-talk/identity.json) |
| **Friend Manager** | 친구 추가/삭제, 친구 목록 저장/로드 | 로컬 JSON 파일 (~/.double-talk/friends.json) |
| **Connection Manager** | P2P 연결 수립, signaling 교환, relay fallback | node-datachannel + WebSocket |
| **Signaling Server** | 사용자 등록, 위치 매칭, SDP/ICE 교환, 온라인 상태 | WebSocket 서버 (ws 라이브러리) |
| **Message Relay** | P2P 실패 시 서버 경유 메시지 전달 | 동일 WebSocket 서버 내 별도 핸들러 |
| **IP Geolocation** | 클라이언트 IP → 위도/경도 변환 | 서버에서 외부 API 호출 |

## Recommended Project Structure

```
double-talk/
├── packages/
│   ├── client/                # CLI 클라이언트 (npm 배포 대상)
│   │   ├── src/
│   │   │   ├── ui/            # TUI 컴포넌트
│   │   │   │   ├── App.tsx    # 메인 TUI 엔트리
│   │   │   │   ├── ChatView.tsx
│   │   │   │   ├── UserList.tsx
│   │   │   │   └── InputBar.tsx
│   │   │   ├── chat/          # 채팅 로직
│   │   │   │   ├── ChatManager.ts
│   │   │   │   └── MessageTypes.ts
│   │   │   ├── identity/      # 사용자 ID 관리
│   │   │   │   └── IdentityManager.ts
│   │   │   ├── friends/       # 친구 목록 관리
│   │   │   │   └── FriendManager.ts
│   │   │   ├── network/       # 네트워크 레이어
│   │   │   │   ├── ConnectionManager.ts
│   │   │   │   ├── SignalingClient.ts
│   │   │   │   └── PeerConnection.ts
│   │   │   ├── config/        # 설정 관리
│   │   │   │   └── Config.ts
│   │   │   └── index.ts       # CLI 엔트리포인트
│   │   ├── bin/
│   │   │   └── double-talk.js # npx 실행 엔트리
│   │   └── package.json
│   │
│   ├── server/                # 경량 신호 서버
│   │   ├── src/
│   │   │   ├── SignalingServer.ts
│   │   │   ├── PresenceManager.ts
│   │   │   ├── GeoLocationService.ts
│   │   │   ├── RelayHandler.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── shared/                # 공유 타입/프로토콜
│       ├── src/
│       │   ├── protocol.ts    # 메시지 프로토콜 정의
│       │   ├── types.ts       # 공유 타입
│       │   └── constants.ts
│       └── package.json
│
├── package.json               # Workspace root
└── tsconfig.json
```

### Structure Rationale

- **packages/ (monorepo):** client, server, shared를 분리하되 하나의 repo에서 관리. shared 패키지로 프로토콜 타입을 공유하여 client-server 간 타입 안전성 확보
- **client/src/ui/:** TUI는 별도 폴더로 분리. 네트워크 로직과 완전히 독립시켜 테스트 용이성 확보
- **client/src/network/:** P2P 연결과 signaling을 하나의 레이어로 묶되, ConnectionManager가 facade 역할. PeerConnection과 SignalingClient는 내부 구현
- **server/:** 최대한 단순하게 유지. stateless에 가깝게 설계 (인메모리 상태만, DB 없음)

## Architectural Patterns

### Pattern 1: Hybrid P2P with Server Relay Fallback

**What:** 기본적으로 WebRTC DataChannel을 통한 P2P 직접 통신을 시도하고, NAT traversal 실패 시 signaling server가 message relay 역할을 수행
**When to use:** NAT 뒤에 있는 사용자가 대부분인 환경 (사실상 거의 모든 환경)
**Trade-offs:**
- PRO: P2P 성공 시 서버 부하 제로, 낮은 지연
- PRO: relay fallback으로 연결 실패 방지
- CON: WebRTC 의존성 추가 (node-datachannel의 네이티브 바이너리)
- CON: 서버가 relay할 때는 서버 부하 증가

**왜 이 방식인가:**
순수 TCP/UDP hole punching은 Node.js에서 안정적 라이브러리가 부재하고 성공률이 낮다. libp2p는 이 프로젝트에 과도하게 복잡하다. WebRTC DataChannel은 NAT traversal을 내장하고 있어 가장 현실적인 선택이다. 다만 node-datachannel은 네이티브 바이너리 의존성이 있어 `npx` 배포 시 주의가 필요하다.

**대안 (더 단순한 접근):** WebRTC를 포기하고 signaling server를 항상 relay로 사용. 서버 부하가 증가하지만 구현이 매우 단순해진다. MVP에서는 이 방식으로 시작하고, 이후 WebRTC P2P를 추가하는 전략이 유효하다.

### Pattern 2: Event-Driven Message Bus (Client Internal)

**What:** 클라이언트 내부에서 EventEmitter 기반 메시지 버스로 컴포넌트 간 통신
**When to use:** TUI, Chat, Network 레이어 간 느슨한 결합이 필요할 때
**Trade-offs:**
- PRO: 컴포넌트 간 직접 의존성 제거
- PRO: 테스트 시 이벤트만 목킹하면 됨
- CON: 이벤트 흐름 추적이 어려울 수 있음

**Example:**
```typescript
// ConnectionManager가 메시지 수신 시
eventBus.emit('message:received', {
  from: 'coder#3A7F',
  content: 'Hello!',
  chatId: 'chat_abc123',
});

// ChatManager가 이를 구독
eventBus.on('message:received', (msg) => {
  chatSessions.get(msg.chatId)?.addMessage(msg);
});

// UI가 ChatManager 상태 변경을 구독
eventBus.on('chat:updated', (chatId) => {
  // re-render
});
```

### Pattern 3: Protocol-First Design (Shared Types)

**What:** client-server 간 모든 메시지를 shared 패키지의 타입 정의로 관리
**When to use:** client와 server가 같은 repo에 있을 때
**Trade-offs:**
- PRO: 프로토콜 변경 시 양쪽에서 컴파일 에러로 즉시 감지
- PRO: 메시지 직렬화/역직렬화 로직 공유
- CON: shared 패키지 변경 시 양쪽 리빌드 필요

**Example:**
```typescript
// shared/src/protocol.ts
export enum MessageType {
  // Signaling
  REGISTER = 'register',
  HEARTBEAT = 'heartbeat',
  DISCOVER_NEARBY = 'discover_nearby',
  NEARBY_USERS = 'nearby_users',

  // P2P setup
  SDP_OFFER = 'sdp_offer',
  SDP_ANSWER = 'sdp_answer',
  ICE_CANDIDATE = 'ice_candidate',

  // Chat (relay fallback)
  CHAT_MESSAGE = 'chat_message',

  // Friends
  FRIEND_REQUEST = 'friend_request',
  FRIEND_STATUS = 'friend_status',
}

export interface RegisterPayload {
  nickname: string;
  tag: string;
  aiCli: string;  // 사용하는 AI CLI 종류
}

export interface NearbyUser {
  nickname: string;
  tag: string;
  aiCli: string;
  distance: number;  // km
  online: boolean;
}
```

## Data Flow

### 1. User Registration & Discovery Flow

```
[Client 시작]
    ↓
[Identity 로드/생성] → ~/.double-talk/identity.json
    ↓
[Signaling Server WebSocket 연결]
    ↓
[REGISTER 메시지 전송] → { nickname, tag, aiCli }
    ↓
[Server: IP에서 위치 추출] → ip-api.com (서버 사이드)
    ↓
[Server: 인메모리에 사용자 등록] → { id, location, ws, lastSeen }
    ↓
[DISCOVER_NEARBY 요청] → { radiusKm: 5 }
    ↓
[Server: 위치 기반 필터링 (Haversine)] → 범위 내 사용자 목록
    ↓
[NEARBY_USERS 응답] → [{ nickname, tag, distance, online }]
    ↓
[UI: 사용자 목록 렌더링]
```

### 2. P2P Chat Initiation Flow (WebRTC Path)

```
[User A: 채팅 요청]
    ↓
[A→Server: SDP_OFFER] → { targetId: "user#TAG", sdp: offer }
    ↓
[Server→B: SDP_OFFER 전달]
    ↓
[B→Server: SDP_ANSWER] → { targetId: "user#TAG", sdp: answer }
    ↓
[Server→A: SDP_ANSWER 전달]
    ↓
[A↔B: ICE_CANDIDATE 교환] (server 경유)
    ↓
[WebRTC DataChannel 수립 성공]
    ↓
[A↔B: 직접 P2P 메시지 교환] (서버 미경유)
```

### 3. Relay Fallback Flow

```
[WebRTC DataChannel 수립 실패] (NAT traversal 실패)
    ↓
[자동으로 relay 모드 전환]
    ↓
[A→Server: CHAT_MESSAGE] → { targetId, content }
    ↓
[Server→B: CHAT_MESSAGE 전달]
    ↓
[B의 UI에 메시지 표시]
```

### 4. Friend Management Flow

```
[User A: 친구추가 "coder#3A7F"]
    ↓
[로컬 friends.json에 저장]
    ↓
[Server에 FRIEND_STATUS 구독 요청] → { friendIds: ["coder#3A7F"] }
    ↓
[Server: 해당 사용자 온라인 상태 실시간 전달]
    ↓
[친구가 온라인 → 직접 채팅 가능 (P2P 또는 relay)]
```

### 5. Group Chat Flow

```
[User A: 그룹 채팅 생성] → { members: ["b#1234", "c#5678"] }
    ↓
[각 멤버에게 P2P 연결 시도 (또는 relay)]
    ↓
[메시지 전송 시 모든 멤버에게 개별 전송]
    ↓
[Full-mesh: 각 peer가 다른 모든 peer와 직접 연결]
```

Note: 그룹 채팅은 full-mesh P2P 방식. 참여자 수가 소규모 (2-10명)이므로 실용적. 대규모 그룹이 필요하면 서버 relay가 더 효율적이지만 현재 scope에서는 불필요.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-100 users | 단일 signaling 서버 (Node.js 프로세스 1개). 인메모리 상태 관리. relay 부하 미미 |
| 100-1K users | 여전히 단일 서버 가능. 위치 검색에 geospatial index 추가 (인메모리 R-tree). P2P 성공률이 중요해짐 |
| 1K-10K users | relay 트래픽이 병목. P2P 성공률 극대화 필요. TURN 서버 도입 고려. 서버를 지역별로 분산 가능 |

### Scaling Priorities

1. **첫 번째 병목: relay 트래픽.** P2P 연결 실패 시 모든 메시지가 서버를 경유. 해결: STUN/TURN 서버로 P2P 성공률 개선
2. **두 번째 병목: 위치 검색.** 사용자 수 증가 시 전체 목록 순회하는 Haversine 계산이 느려짐. 해결: geohash 기반 인덱싱

## Anti-Patterns

### Anti-Pattern 1: 서버를 메시지 브로커로 만들기

**What people do:** P2P를 포기하고 모든 메시지를 서버에서 중계
**Why it's wrong:** 서버 비용 증가, 단일 장애점, 프로젝트 핵심 가치(P2P) 상실
**Do this instead:** MVP에서 relay로 시작하되, P2P 전환을 아키텍처에 미리 반영. ConnectionManager가 transport를 추상화하여 relay→P2P 전환이 투명하도록 설계

### Anti-Pattern 2: 클라이언트에서 직접 geolocation API 호출

**What people do:** 클라이언트가 자신의 IP를 얻어서 geolocation API를 호출
**Why it's wrong:** 클라이언트 IP를 클라이언트 자신이 아는 것은 어렵다 (NAT 뒤에서 사설 IP만 보임). 또한 무료 API 키가 클라이언트에 노출됨
**Do this instead:** 서버가 WebSocket 연결의 원격 IP로 geolocation을 조회. API 키는 서버에만 보관

### Anti-Pattern 3: TUI와 네트워크 로직 직접 결합

**What people do:** UI 컴포넌트 안에서 직접 WebSocket/P2P 연결 코드를 작성
**Why it's wrong:** 테스트 불가, 상태 관리 복잡, UI 프레임워크 변경 시 전체 재작성
**Do this instead:** EventEmitter 또는 간단한 state store로 UI와 네트워크를 분리. UI는 상태만 구독

### Anti-Pattern 4: Symmetric NAT에서 P2P 강제 시도

**What people do:** WebRTC 연결이 안 되는데 계속 재시도
**Why it's wrong:** symmetric NAT 환경에서는 STUN만으로 연결 불가. 사용자 경험 저하
**Do this instead:** ICE 연결 실패 시 빠르게 (5초 이내) relay fallback 전환. 사용자에게는 차이가 보이지 않도록

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| ip-api.com | Server→HTTP GET (JSON) | 무료 45req/min. 가입 불필요. HTTP only (무료 tier). 서버에서만 호출 |
| STUN server | Client→UDP | Google 공개 STUN (stun:stun.l.google.com:19302). 무료, 가입 불필요 |
| TURN server (optional) | Client→UDP/TCP | Metered.ca 무료 tier 또는 coturn 자체 호스팅. P2P 실패 시에만 사용 |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| UI ↔ ChatManager | EventEmitter | UI는 ChatManager 상태를 구독만 함. 직접 네트워크 호출 금지 |
| ChatManager ↔ ConnectionManager | EventEmitter + async API | ChatManager가 `sendMessage()` 호출, ConnectionManager가 transport 결정 |
| ConnectionManager ↔ SignalingClient | Direct API calls | 같은 network 레이어 내부. WebSocket 연결 관리 |
| ConnectionManager ↔ PeerConnection | Direct API calls | P2P 연결 수립/해제. WebRTC DataChannel 래핑 |
| Client ↔ Server | WebSocket (JSON) | shared 패키지의 프로토콜 타입 사용. 모든 메시지 타입 정의됨 |

## Build Order (Dependency Graph)

아키텍처 의존성에 따른 구현 순서:

```
Phase 1: Foundation
  shared/protocol.ts  ← 모든 것의 기반
  client/identity/    ← 서버 연결 전 필요
  server/basic        ← WebSocket 서버 뼈대

Phase 2: Discovery
  server/geolocation  ← 위치 기반 매칭
  server/presence     ← 사용자 등록/발견
  client/network/SignalingClient  ← 서버 연결

Phase 3: Messaging (Relay First)
  server/relay        ← 메시지 중계 (가장 단순한 통신)
  client/chat/        ← 채팅 세션 관리
  client/ui/          ← TUI 렌더링

Phase 4: P2P Upgrade
  client/network/PeerConnection  ← WebRTC DataChannel
  server/signaling (SDP/ICE)     ← P2P 수립 지원
  ConnectionManager 확장          ← relay→P2P 자동 전환

Phase 5: Social
  client/friends/     ← 친구 관리
  server/friend-status ← 온라인 상태 추적
  group chat          ← multi-peer 연결
```

**Rationale:** relay-first로 시작하면 Phase 3에서 이미 동작하는 채팅 앱을 가질 수 있다. P2P는 Phase 4에서 "성능 최적화"로 추가하여, 핵심 기능과 P2P 복잡성을 분리한다.

## Sources

- [node-datachannel (WebRTC for Node.js)](https://www.npmjs.com/package/node-datachannel) - Node.js WebRTC DataChannel 바인딩
- [Tailscale NAT Traversal Guide](https://tailscale.com/blog/how-nat-traversal-works) - NAT traversal 기법 심층 설명
- [ip-api.com](https://ip-api.co/) - 무료 IP geolocation API
- [Socket.IO P2P](https://socket.io/blog/socket-io-p2p/) - WebSocket + WebRTC hybrid 패턴 참조
- [simple-peer](https://github.com/feross/simple-peer) - WebRTC 단순화 라이브러리
- [udp-hole-puncher](https://www.npmjs.com/package/udp-hole-puncher) - UDP hole punching (참고용)
- [libp2p chat example](https://github.com/libp2p/js-libp2p-example-chat) - 분산 P2P 채팅 아키텍처 참조

---
*Architecture research for: Double Talk - CLI P2P Chat*
*Researched: 2026-03-19*
