# Cling Talk Architecture

> CLI P2P 채팅 도구 — 터미널을 떠나지 않고 근처 개발자와 즉시 대화
> 실행: `npx cling-talk`

---

## 1. 전체 구조 개요

```
┌─────────────────────────────────────────────────────────────┐
│                      Cling Talk                             │
│                                                             │
│  "터미널을 떠나지 않고 근처 개발자와 즉시 대화"                │
│  실행: npx cling-talk                                       │
├───────────┬───────────────────────┬─────────────────────────┤
│  shared/  │       client/         │        server/          │
│           │                       │                         │
│ Protocol  │  TUI (Ink/React)      │  SignalingServer        │
│ Types     │  Hooks (상태관리)      │  PresenceManager       │
│ Constants │  Network (연결추상화)   │  ChatSessionManager    │
│ Schemas   │  Identity/Config      │  GeoLocationService    │
└───────────┴───────────────────────┴─────────────────────────┘
```

---

## 2. 패키지별 역할

| 패키지 | 역할 | 핵심 모듈 |
|--------|------|-----------|
| `shared/` | 프로토콜 정의 (zod schema), 공유 타입, 상수 | `protocol.ts` (43개 메시지 타입), `types.ts`, `constants.ts` |
| `client/` | CLI TUI 앱 (npm 배포) | UI 컴포넌트, React hooks, 네트워크 계층, Identity 관리 |
| `server/` | 경량 신호 서버 | WebSocket 서버, Presence 관리, 채팅 relay, IP Geolocation |

**Import 규칙**: `client → shared ✅` / `server → shared ✅` / `client ↔ server ❌`

---

## 3. Client 계층 구조

```
┌─────────────────────────────────────────────┐
│              UI Layer (Ink/React)            │
│  ChatScreen ─┬─ MessageArea (메시지 스크롤)   │
│              ├─ IMETextInput (CJK 입력)      │
│              ├─ StatusBar (연결상태)          │
│              ├─ UserList (근처 사용자)         │
│              ├─ FriendList (친구 목록)        │
│              ├─ ChatRequestOverlay (수신요청)  │
│              └─ CommandSuggestions (자동완성)  │
├─────────────────────────────────────────────┤
│              Hooks Layer (상태관리)           │
│  useServerConnection → 연결 상태             │
│  useNearbyUsers      → 근처 사용자 목록       │
│  useChatSession      → 채팅 상태 전체         │
│  useFriends          → 친구 상태             │
├─────────────────────────────────────────────┤
│              Network Layer (추상화)           │
│  ConnectionManager ─┬─ SignalingClient       │
│    (relay↔P2P 투명)  └─ HyperswarmTransport  │
├─────────────────────────────────────────────┤
│              Storage Layer                   │
│  IdentityManager (닉네임#TAG)                │
│  FriendManager (친구 목록)                    │
│  AppConfig (XDG conf)                        │
└─────────────────────────────────────────────┘
```

### Client 파일 구조

```
packages/client/src/
├── index.tsx                       # 진입점
├── ui/
│   ├── App.tsx                     # 앱 라우터 (onboarding/chat 분기)
│   ├── theme.ts                    # Ink 색상 테마
│   ├── screens/
│   │   ├── OnboardingScreen.tsx    # 닉네임 + AI CLI 선택
│   │   └── ChatScreen.tsx          # 메인 화면 (모든 훅 조합)
│   └── components/
│       ├── MessageArea.tsx         # 메시지 렌더링 (scroll)
│       ├── IMETextInput.tsx        # CJK 입력 (string-width)
│       ├── UserList.tsx            # 근처 사용자 목록
│       ├── FriendList.tsx          # 친구 목록
│       ├── StatusBar.tsx           # 상태바 (connection, transport)
│       ├── ChatRequestOverlay.tsx  # 수신 요청 모달
│       ├── CommandSuggestions.tsx   # 명령 자동완성
│       ├── AsciiBanner.tsx         # ASCII art
│       └── TransitionLine.tsx      # 시스템 메시지 구분선
├── network/
│   ├── SignalingClient.ts          # WebSocket relay
│   ├── ConnectionManager.ts        # relay ↔ P2P 추상화
│   └── HyperswarmTransport.ts      # Hyperswarm P2P
├── hooks/
│   ├── useServerConnection.ts      # 연결 상태 + transportType
│   ├── useNearbyUsers.ts           # 근처 사용자 + radius cycle
│   ├── useChatSession.ts           # 채팅 상태 (전체 세션 로직)
│   ├── useFriends.ts               # 친구 상태 + subscribe
│   └── useGracefulExit.ts          # Ctrl+C 핸들링
├── identity/
│   └── IdentityManager.ts          # Identity CRUD (TAG, conf)
├── friends/
│   └── FriendManager.ts            # Friend list CRUD (local conf)
├── config/
│   └── AppConfig.ts                # Conf 래퍼 (XDG)
└── commands/
    └── CommandParser.ts            # /help, /users 등 파싱
```

---

## 4. Server 내부 구조

| 모듈 | 책임 | 데이터 |
|------|------|--------|
| **SignalingServer** | WebSocket 서버, 메시지 라우팅, heartbeat | 모든 핸들러 조합 |
| **PresenceManager** | 사용자 등록/해제, 근처 검색 | `Map<userId, UserRecord>` |
| **ChatSessionManager** | 채팅 요청/수락/거절, 세션 추적 | `Map<sessionId, ChatSession>`, `pendingRequests` |
| **GeoLocationService** | IP→좌표 변환, haversine 거리 | geoip-lite (서버사이드만) |

### Server 파일 구조

```
packages/server/src/
├── index.ts                  # 진입점 (PORT env)
├── SignalingServer.ts        # WebSocket 서버 (모든 로직)
├── PresenceManager.ts        # 사용자 레지스트리 + 근처 검색
├── ChatSessionManager.ts     # 세션 + pending 요청 추적
├── GeoLocationService.ts     # IP geolocation + haversine
└── types.ts                  # UserRecord, GeoResult
```

---

## 5. 핵심 동작 플로우

### 5.1 접속 & 사용자 발견

```
사용자 A                    서버                      사용자 B
   │                         │                          │
   │──── REGISTER ──────────▶│                          │
   │    {nickname, tag, cli} │                          │
   │                         │ IP geolocation           │
   │                         │ → {lat, lon} 저장        │
   │◀── REGISTERED ─────────│                          │
   │    {users: [B, C, ...]} │                          │
   │                         │──── USER_JOINED ────────▶│
   │                         │    {A의 정보}             │
```

### 5.2 채팅 요청 → 수락 → 메시지 교환

```
사용자 A                    서버                      사용자 B
   │                         │                          │
   │── CHAT_REQUEST ────────▶│                          │
   │   {target: B}           │── CHAT_REQUESTED ───────▶│
   │                         │   {sessionId, from: A}    │
   │                         │                          │
   │                         │◀── CHAT_ACCEPT ─────────│
   │◀── CHAT_ACCEPTED ──────│   {sessionId}             │
   │   {sessionId, partner}  │                          │
   │                         │                          │
   ╠═══════ P2P 업그레이드 시도 (3초 timeout) ══════════╣
   │── P2P_SIGNAL ──────────▶│── P2P_SIGNAL ───────────▶│
   │   {topic}               │   {topic}                │
   │                         │                          │
   │◀═══════ Hyperswarm 직접 연결 시도 ════════════════▶│
   │         성공 → direct (초록)                        │
   │         실패 → relay 유지 (노랑)                    │
   │                         │                          │
   │── CHAT_MESSAGE ────────▶│── CHAT_MSG ─────────────▶│
   │   (relay 경로)          │   {from, content, ts}     │
   │         또는             │                          │
   │◀═══ Hyperswarm stream ══▶│  (P2P 직접 경로)         │
```

### 5.3 Onboarding 플로우

```
App.tsx
  ├─ loadIdentity() → identity 없음?
  └─ OnboardingScreen
     ├─ 닉네임 입력 (regex: [a-z0-9_-]{1,16})
     ├─ AI CLI 선택 (Claude Code/Codex/Gemini/Cursor)
     └─ saveIdentity() → generateTag() (crypto.randomBytes(2))
        └─ appConfig.set('identity')
           └─ ChatScreen 진입
```

### 5.4 이벤트 흐름 요약

```
사용자 입력
  ↓
IMETextInput.onSubmit(text)
  ↓
ChatScreen.handleSubmit(text)
  ├─ parseInput() → command or message
  │  ├─ /users → setShowUserList(true)
  │  ├─ /friends → setShowFriendList(true)
  │  ├─ /addfriend → FriendManager.addFriend()
  │  └─ /leave → client.leaveChat()
  └─ else: sendMessage(text)
     └─ client.sendChatMessage(sessionId, content)
        ├─ transportType === 'direct'?
        │  └─ p2pTransport.send() → Hyperswarm stream
        └─ else: SignalingClient.send(CHAT_MESSAGE)
           └─ WebSocket to server → relay to partner
```

---

## 6. Transport 추상화 (Relay vs P2P)

```
              ConnectionManager
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
   SignalingClient      HyperswarmTransport
   (WebSocket relay)    (P2P direct)
          │                   │
   항상 연결             채팅 수락 시 시도
   모든 signaling용      3초 내 실패 → 폐기
   채팅 fallback         성공 → 메시지 직접전달
```

| 항목 | Relay (기본) | P2P (업그레이드) |
|------|-------------|-----------------|
| 경로 | A → Server → B | A ↔ B 직접 |
| 지연 | 서버 경유 (느림) | 직접 (빠름) |
| StatusBar 색상 | 노랑 | 초록 |
| 실패 시 | - | relay로 자동 폴백 |
| NAT 관통 | 불필요 | 필요 (15-30% 실패) |

---

## 7. 프로토콜 메시지 분류

| 카테고리 | 메시지 타입 | 방향 |
|----------|------------|------|
| **Presence** | `REGISTER`, `REGISTERED` | C→S, S→C |
| | `GET_NEARBY`, `NEARBY_USERS` | C→S, S→C |
| | `USER_JOINED`, `USER_LEFT`, `USER_STATUS` | S→C (broadcast) |
| **Chat** | `CHAT_REQUEST`, `CHAT_REQUESTED` | C→S, S→C |
| | `CHAT_ACCEPT/DECLINE`, `CHAT_ACCEPTED/DECLINED` | C→S, S→C |
| | `CHAT_MESSAGE`, `CHAT_MSG` | C→S (송신), S→C (수신) |
| | `CHAT_LEAVE`, `CHAT_LEFT` | C→S, S→C |
| **Friends** | `FRIEND_STATUS_REQUEST/RESPONSE/UPDATE` | C↔S |
| **P2P** | `P2P_SIGNAL`, `P2P_STATUS` | C→S→C (relay) |

총 **43개** 메시지 타입, 모두 zod schema로 검증

---

## 8. 재연결 전략

```
연결 끊김 감지
    │
    ├─ attempt 0: 500ms 대기
    ├─ attempt 1: 1000ms × jitter
    ├─ attempt 2: 2000ms × jitter
    ├─ attempt 3: 4000ms × jitter
    ├─ ...
    └─ max: 30,000ms (30초 cap)

    jitter = 0.5 + Math.random()  (0.5x ~ 1.5x)
```

채팅 중 재연결 시:
1. `chatStatus = 'disconnected'` → 시스템 메시지 표시
2. 재연결 성공 → 상대방에게 자동 채팅 재요청
3. `chatStatus = 'requesting'` → 시스템 메시지 표시

---

## 9. 주요 상수 & 타임아웃

| 상수 | 값 | 용도 |
|------|-----|------|
| `HEARTBEAT_INTERVAL` | 30초 | 클라이언트↔서버 heartbeat |
| `STALE_TIMEOUT` | 60초 | 응답 없으면 offline 처리 |
| `CHAT_REQUEST_TIMEOUT` | 30초 | 수락 대기 시간 |
| `P2P_UPGRADE_TIMEOUT` | 3초 | P2P 연결 시도 제한 |
| `RECONNECT_BASE_DELAY` | 500ms | 재연결 초기 지연 |
| `RECONNECT_MAX_DELAY` | 30초 | 재연결 최대 지연 |
| `MAX_MESSAGES` | 500개 | 채팅 메시지 버퍼 |
| `MAX_MESSAGE_LENGTH` | 2,000자 | 메시지 최대 길이 |
| `DEFAULT_RADIUS` | 3km | 기본 검색 반경 |
| `RADIUS_OPTIONS` | [1, 3, 5, 10] km | 반경 사이클 옵션 |

---

## 10. 보안 원칙

| 원칙 | 구현 |
|------|------|
| IP 비노출 | 사용자 목록에 IP 절대 미포함, P2P 핸드셰이크 시에만 교환 |
| 서버 무저장 | 메시지 relay 시 로깅/저장 금지 |
| 예측 불가 TAG | `crypto.randomBytes(2)` → 4자리 hex |
| 서버사이드 위치 | IP geolocation은 서버에서만 (클라이언트 IP 노출 방지) |
| 세션 메모리만 | 클라이언트도 메시지 영구 저장 안 함 |

---

## 11. CJK/IME 처리 (최우선 기술 리스크)

`IMETextInput` 컴포넌트가 핵심:

```
문자열 "한글test" 처리:

  .length      → 7      ❌ 잘못된 폭
  string-width → 10     ✅ 한(2) + 글(2) + t(1) + e(1) + s(1) + t(1)
```

- 커서 위치: column 단위로 계산
- `textRef`로 IME 조합 중 race condition 방지
- `getVisibleWindow()`로 스크롤 범위 유지

---

## 12. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js | >=20 LTS |
| Language | TypeScript (strict, ESM-only) | ^5.7 |
| TUI | Ink + React | ^6.8.0 / ^18 |
| P2P | Hyperswarm | ^4.16.0 |
| Signaling | ws | ^8.19.0 |
| Geolocation | geoip-lite (server-side only) | latest |
| Validation | zod | ^3.24 |
| Config | conf (XDG compliant) | latest |
| Build | tsdown | latest |
| Test | vitest | latest |
