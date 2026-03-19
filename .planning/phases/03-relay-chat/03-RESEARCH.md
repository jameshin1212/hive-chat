# Phase 3: Relay Chat - Research

**Researched:** 2026-03-19
**Domain:** WebSocket relay chat protocol, React/Ink TUI chat UI, session management
**Confidence:** HIGH

## Summary

Phase 3는 기존 signaling server WebSocket 인프라 위에 1:1 채팅 relay 기능을 구축한다. 핵심은 세 가지: (1) shared protocol에 채팅 관련 메시지 타입 추가 (CHAT_REQUEST, CHAT_ACCEPT, CHAT_DECLINE, CHAT_MESSAGE, CHAT_LEAVE), (2) 서버에 targeted relay 핸들러 추가 (broadcast가 아닌 특정 userId로 메시지 전달), (3) 클라이언트에 채팅 세션 상태 관리 hook + 채팅 UI 상태 전환.

기존 코드베이스가 이미 EventEmitter 기반 SignalingClient, React hooks 패턴 (useServerConnection, useNearbyUsers), zod discriminated union protocol, UserList 오버레이 패턴을 갖추고 있어 확장이 자연스럽다. 서버 측은 `SignalingServer.handleMessage`의 switch문에 새 메시지 타입 핸들러를 추가하고, PresenceManager로 target userId의 WebSocket을 조회하여 relay하면 된다.

**Primary recommendation:** Protocol-first로 shared에 채팅 메시지 스키마를 먼저 정의한 뒤, 서버 relay 핸들러 → 클라이언트 useChatSession hook → UI 통합 순서로 진행. 복잡한 추상화 없이 기존 패턴을 그대로 확장.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- 채팅 시작 흐름: /users -> 화살표 선택 -> Enter -> 바로 채팅 화면 전환 (요청/수락 없이 내가 시작)
- 한 번에 하나의 대화만 가능 (멀티 대화 없음)
- 대화 종료: /leave 명령어로 현재 대화 나가기 -> 메인 화면 복귀
- 수신 요청 처리: 상대방이 채팅을 시작하면 팝업 오버레이로 수락/거절 프롬프트
- 수락 -> 채팅 화면 전환, 거절 -> 조용히 무시 (요청자에게 알림 없음)
- 메시지 표시 포맷: `[14:23] [Claude Code] coder#3A7F: hello`
- 내 메시지 vs 상대 메시지: 색상으로 구분 (각자의 테마 색상 적용)
- 전송 확인 표시 없음 (체크마크 등 없이 간결하게)
- 알림: 터미널 벨 (\x07) 사용, 포커스 없을 때만, OS 데스크톱 알림 없음
- 연결 끊김 시: 기존 메시지 화면에 유지 + 시스템 메시지 "연결 끊김" + 입력 비활성화
- 서버 재연결 시: 시스템 메시지 "재연결됨" + 입력 활성화
- 끊긴 동안 전송 시도한 메시지: 유실 (버퍼링/재전송 없음)
- 상대방 오프라인 시: 시스템 메시지 "[nick#tag] went offline" + 채팅창 유지

### Claude's Discretion
- 서버 relay 프로토콜 메시지 설계 (CHAT_REQUEST, CHAT_ACCEPT, CHAT_MESSAGE 등)
- 채팅 세션 관리 방식 (서버 측)
- 팝업 오버레이 UI 디자인
- 입력 비활성화 구현 방식

### Deferred Ideas (OUT OF SCOPE)
- 그룹 채팅 -- v2 (Phase 외)
- 메시지 전송 확인 (체크마크) -- 불필요로 결정
- OS 데스크톱 알림 -- 불필요로 결정, 터미널 벨만
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MESG-01 | 1:1 P2P 채팅 (직접 연결 우선, relay fallback) | Phase 3에서는 relay-only. Protocol 메시지 설계 + 서버 relay 핸들러 + 클라이언트 세션 관리. P2P 업그레이드는 Phase 5 |
| MESG-02 | 메시지 비저장 -- 세션 동안 터미널에만 표시, 종료 시 소멸 | React state (useState)로만 메시지 보관. 서버 relay 시 저장/로깅 금지. MAX_MESSAGES=500 cap 유지 |
| MESG-03 | 연결 끊김 시 자동 재연결 및 graceful disconnect 처리 | 기존 SignalingClient 재연결 로직 활용. 채팅 세션 상태를 연결 상태와 연동. 입력 비활성화/활성화 |
| SOCL-04 | 새 메시지 수신 시 터미널 알림 (bell/notification) | process.stdout.write('\x07') 터미널 벨. process.stdout.isTTY + focus 감지로 조건부 발동 |
</phase_requirements>

## Standard Stack

### Core (이미 프로젝트에 설치됨)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zod | ^3.24 | 채팅 프로토콜 메시지 스키마 정의/검증 | 이미 protocol.ts에서 사용 중, discriminatedUnion 패턴 확립 |
| ws | ^8.19.0 | WebSocket relay 통신 | 서버/클라이언트 양쪽에서 이미 사용 중 |
| ink | ^6.8.0 | TUI 렌더링 (채팅 화면, 오버레이) | 이미 React 기반 UI 전체가 Ink 위에 구축됨 |
| react | ^19.0.0 | UI 상태 관리, hooks | ChatScreen, hooks 전부 React 기반 |
| string-width | (설치됨) | CJK 문자 폭 계산 | MessageArea에서 이미 사용 중 |

### Supporting (새 추가 불필요)
이 Phase에서 새로운 npm 패키지 설치가 필요하지 않다. 모든 기능이 기존 스택과 Node.js 내장 모듈로 구현 가능.

| 기능 | 구현 방식 |
|------|-----------|
| 타임스탬프 포맷 | `new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })` 또는 수동 HH:MM |
| 터미널 벨 | `process.stdout.write('\x07')` (내장) |
| 세션 ID | `crypto.randomUUID()` (Node.js 내장) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| 수동 timestamp format | dayjs/date-fns | 불필요한 의존성. HH:MM 포맷 하나에 라이브러리는 과잉 |
| in-memory 세션 관리 | Redis | 단일 서버이므로 Map으로 충분. 불필요한 인프라 복잡도 |

## Architecture Patterns

### Recommended Changes to Project Structure
```
packages/
  shared/src/
    protocol.ts          # 채팅 메시지 타입 추가 (CHAT_REQUEST 등)
  server/src/
    SignalingServer.ts    # handleMessage switch에 채팅 핸들러 추가
    ChatSessionManager.ts # NEW: 활성 채팅 세션 추적 (sessionId -> {userA, userB})
  client/src/
    hooks/
      useChatSession.ts  # NEW: 채팅 세션 상태 관리 hook
    ui/
      screens/
        ChatScreen.tsx   # 채팅 모드 상태 추가, /leave 처리
      components/
        ChatRequestOverlay.tsx  # NEW: 수신 채팅 요청 수락/거절 오버레이
        MessageArea.tsx  # 타임스탬프 표시 추가
    commands/
      CommandParser.ts   # /leave 명령어 추가
```

### Pattern 1: Protocol Extension (Discriminated Union 확장)
**What:** 기존 clientMessageSchema/serverMessageSchema discriminated union에 채팅 메시지 타입을 추가
**When to use:** 새 메시지 타입이 필요할 때 항상 이 패턴

기존 코드에서 확인된 패턴:
```typescript
// packages/shared/src/protocol.ts - 기존 패턴 그대로 확장
export const MessageType = {
  // ... 기존 타입들 ...
  // Client -> Server (채팅)
  CHAT_REQUEST: 'chat_request',
  CHAT_ACCEPT: 'chat_accept',
  CHAT_DECLINE: 'chat_decline',
  CHAT_MESSAGE: 'chat_message',
  CHAT_LEAVE: 'chat_leave',
  // Server -> Client (채팅)
  CHAT_REQUESTED: 'chat_requested',    // 상대방에게 요청 도착 알림
  CHAT_ACCEPTED: 'chat_accepted',      // 요청자에게 수락 알림
  CHAT_DECLINED: 'chat_declined',      // 요청자에게 거절 알림 (선택적)
  CHAT_MSG: 'chat_msg',               // relay된 메시지
  CHAT_LEFT: 'chat_left',             // 상대방 나감 알림
  CHAT_USER_OFFLINE: 'chat_user_offline', // 상대방 오프라인
} as const;
```

**설계 결정: 클라이언트->서버 vs 서버->클라이언트 분리**
- 클라이언트가 보내는 메시지 (CHAT_REQUEST, CHAT_ACCEPT 등)와 서버가 보내는 메시지 (CHAT_REQUESTED, CHAT_ACCEPTED 등)를 구분
- 기존 패턴과 동일: 클라이언트 메시지에는 `targetNickname` + `targetTag`, 서버가 이를 조회하여 해당 WebSocket으로 전달

### Pattern 2: Server-Side Session Tracking
**What:** 서버가 활성 채팅 세션을 Map으로 추적하여 유효성 검증
**When to use:** 채팅 메시지 relay 시 세션이 유효한지 확인

```typescript
// 서버 측 세션 관리 (간단한 Map)
interface ChatSession {
  id: string;           // crypto.randomUUID()
  userA: string;        // userId (nickname#tag)
  userB: string;        // userId (nickname#tag)
  createdAt: number;
}

// Map<sessionId, ChatSession> + Map<userId, sessionId>
// userId -> sessionId 역인덱스로 "이 사용자가 이미 대화 중인지" 빠르게 조회
```

**설계 근거:**
- 서버가 세션을 추적하면: 이미 대화 중인 사용자에게 새 요청이 오면 거절 가능, 세션이 없는 채팅 메시지는 무시 가능
- 사용자 연결 끊김 시 해당 세션의 상대방에게 알림 전송 가능
- 세션 데이터는 인메모리만 (저장 금지 규칙 준수)

### Pattern 3: useChatSession Hook (클라이언트 상태 관리)
**What:** useServerConnection/useNearbyUsers 패턴을 따르는 채팅 세션 전용 hook
**When to use:** ChatScreen에서 채팅 세션 생명주기 관리

```typescript
// 기존 패턴 참조: useNearbyUsers가 SignalingClient 이벤트를 구독하는 방식과 동일
interface ChatSessionState {
  status: 'idle' | 'requesting' | 'active' | 'disconnected';
  partner: NearbyUser | null;
  messages: ChatMessage[];
  sessionId: string | null;
}

// hook이 SignalingClient 이벤트 구독:
// 'chat_requested' -> 수신 요청 처리 (오버레이 표시)
// 'chat_accepted' -> 세션 활성화
// 'chat_msg' -> 메시지 추가
// 'chat_left' -> 세션 종료 알림
// 'chat_user_offline' -> 상대방 오프라인 표시
```

### Pattern 4: Targeted Relay (Broadcast가 아닌 1:1 전달)
**What:** 기존 `broadcastToRegistered`와 달리, 특정 userId의 WebSocket으로만 메시지 전달
**When to use:** 모든 채팅 메시지

```typescript
// SignalingServer에 추가할 메서드 패턴
private sendToUser(targetUserId: string, message: ServerMessage): boolean {
  const user = this.presenceManager.getUser(targetUserId);
  if (!user || user.ws.readyState !== WebSocket.OPEN) return false;
  this.send(user.ws, message);
  return true;
}
```

기존 코드에서 `PresenceManager.getUser(id)`가 `UserRecord`를 반환하고, `UserRecord`에 `ws: WebSocket`이 이미 있으므로 targeted send가 자연스럽다.

### Anti-Patterns to Avoid
- **채팅 메시지를 broadcast로 전송:** 모든 클라이언트에게 보내면 안 됨. 반드시 targetUserId로 1:1 relay
- **클라이언트에서 sessionId 생성:** 서버가 세션을 관리하므로 서버에서 sessionId를 생성하여 양쪽에 전달
- **메시지 저장/로깅:** 서버에서 relay 시 메시지 내용을 로깅하거나 저장 금지 (protocol-design.md 규칙)
- **UI 컴포넌트에서 직접 WebSocket 호출:** 반드시 hook을 통해 SignalingClient 이벤트로 통신

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 타임스탬프 포맷 | 수동 Date 파싱 | `Date.toLocaleTimeString` 또는 간단한 HH:MM 헬퍼 | timezone은 클라이언트 로컬 시간 사용하므로 복잡한 처리 불필요 |
| 재연결 로직 | 새로운 재연결 구현 | 기존 SignalingClient의 exponential backoff 로직 | 이미 구현/테스트됨 |
| 오버레이 UI 패턴 | 새 오버레이 시스템 | UserList 오버레이 패턴 재사용 | useInput({ isActive }) 패턴이 이미 작동 확인됨 |
| 메시지 ID 생성 | 커스텀 ID 체계 | `crypto.randomUUID()` | 충돌 없는 표준 UUID |

**Key insight:** 이 Phase의 모든 기능은 기존 인프라 확장으로 구현 가능하다. 새 라이브러리나 새 패턴이 필요하지 않다.

## Common Pitfalls

### Pitfall 1: 채팅 요청과 세션 상태 불일치
**What goes wrong:** 사용자 A가 요청을 보내는 동안 사용자 B가 이미 다른 대화에 참여하거나, A의 요청이 도달하기 전에 B가 오프라인이 됨
**Why it happens:** 네트워크 지연으로 상태가 비동기적으로 변함
**How to avoid:**
- 서버가 세션 상태의 single source of truth 역할
- CHAT_REQUEST 수신 시 서버가 target 사용자의 현재 상태를 먼저 확인:
  - 이미 대화 중이면 → 요청자에게 즉시 ERROR (busy) 반환
  - 오프라인이면 → 요청자에게 즉시 ERROR (offline) 반환
  - 가용하면 → target에게 CHAT_REQUESTED 전달
**Warning signs:** "채팅 요청 보냈는데 응답이 안 옴" 상태가 무한히 지속

### Pitfall 2: 연결 끊김 시 채팅 세션 좀비
**What goes wrong:** 사용자가 갑자기 연결이 끊겼을 때 상대방이 여전히 "대화 중" 상태로 남음
**Why it happens:** TCP 연결 끊김이 즉시 감지되지 않음 (Pitfall 6 from PITFALLS.md)
**How to avoid:**
- 서버의 기존 `handleClose` 이벤트에서 해당 사용자의 활성 세션을 확인하고 상대방에게 CHAT_USER_OFFLINE 전송
- heartbeat 타임아웃으로 stale 감지 시에도 동일 처리
- 클라이언트는 CHAT_USER_OFFLINE 수신 시 시스템 메시지 표시 + 입력 비활성화 (단, 채팅창 유지)
**Warning signs:** 상대방이 사라졌는데 채팅창이 정상처럼 보임

### Pitfall 3: 재연결 후 채팅 세션 복구 실패
**What goes wrong:** 서버 재연결 후 이전 채팅 세션이 소실되어 메시지 relay가 안 됨
**Why it happens:** 재연결 시 새 WebSocket이 생성되고, 서버에 재등록(REGISTER)하면 이전 세션 정보가 없음
**How to avoid:**
- CONTEXT.md 결정에 따라 끊긴 동안 메시지는 유실 (버퍼링/재전송 없음)
- 재연결 시: 클라이언트가 이전 대화 상대 정보를 로컬에 보유 → 재연결 성공 후 자동으로 CHAT_REQUEST 재전송하여 세션 복구 시도
- 세션 복구 실패 시 (상대방이 이미 오프라인이면): 시스템 메시지로 알림
**Warning signs:** 재연결 후 메시지를 보내도 상대방에게 안 도착

### Pitfall 4: 거절 시 요청자에게 알림 없음으로 인한 UX 혼란
**What goes wrong:** CONTEXT.md에서 "거절 -> 조용히 무시"로 결정했으나, 요청자가 무한 대기 상태에 빠짐
**Why it happens:** 거절해도 요청자에게 아무 피드백이 없음
**How to avoid:**
- 요청자 측에 타임아웃 설정 (예: 30초). 타임아웃 시 시스템 메시지 "응답 없음" + 요청 취소
- 서버에서 CHAT_DECLINED를 "silent decline"로 구현 — 요청자에게는 특정 에러가 아닌 타임아웃으로 자연스럽게 처리
**Warning signs:** 요청 보낸 후 아무 변화 없이 영원히 "요청 중..."

### Pitfall 5: MessageArea 타임스탬프 추가 시 기존 레이아웃 깨짐
**What goes wrong:** 타임스탬프 `[14:23]`를 추가하면 기존 MessageArea 렌더링 포맷이 바뀌어 string-width 계산이 어긋남
**Why it happens:** 기존 MessageArea는 타임스탬프 없이 `[AI CLI] nick#tag: msg` 포맷
**How to avoid:**
- 기존 MessageArea의 렌더링 로직을 확장하되, 타임스탬프를 가장 앞에 추가하는 식으로 간단하게 처리
- `[HH:MM]` 은 고정 7자이므로 레이아웃에 미치는 영향이 예측 가능
**Warning signs:** 한글 닉네임 + 타임스탬프 조합에서 컬럼 정렬이 어긋남

## Code Examples

### 1. 채팅 프로토콜 메시지 스키마 (shared/protocol.ts 확장)

```typescript
// Source: 기존 protocol.ts 패턴 확장
// Client -> Server
export const chatRequestSchema = z.object({
  type: z.literal(MessageType.CHAT_REQUEST),
  targetNickname: z.string(),
  targetTag: z.string(),
});

export const chatAcceptSchema = z.object({
  type: z.literal(MessageType.CHAT_ACCEPT),
  sessionId: z.string().uuid(),
});

export const chatDeclineSchema = z.object({
  type: z.literal(MessageType.CHAT_DECLINE),
  sessionId: z.string().uuid(),
});

export const chatMessageSchema = z.object({
  type: z.literal(MessageType.CHAT_MESSAGE),
  sessionId: z.string().uuid(),
  content: z.string().min(1).max(2000),
});

export const chatLeaveSchema = z.object({
  type: z.literal(MessageType.CHAT_LEAVE),
  sessionId: z.string().uuid(),
});

// Server -> Client
export const chatRequestedSchema = z.object({
  type: z.literal(MessageType.CHAT_REQUESTED),
  sessionId: z.string().uuid(),
  from: nearbyUserSchema,  // 요청자 정보
});

export const chatAcceptedSchema = z.object({
  type: z.literal(MessageType.CHAT_ACCEPTED),
  sessionId: z.string().uuid(),
  partner: nearbyUserSchema,
});

export const chatMsgSchema = z.object({
  type: z.literal(MessageType.CHAT_MSG),
  sessionId: z.string().uuid(),
  from: z.object({ nickname: z.string(), tag: z.string() }),
  content: z.string(),
  timestamp: z.number(),
});

export const chatLeftSchema = z.object({
  type: z.literal(MessageType.CHAT_LEFT),
  sessionId: z.string().uuid(),
  nickname: z.string(),
  tag: z.string(),
});

export const chatUserOfflineSchema = z.object({
  type: z.literal(MessageType.CHAT_USER_OFFLINE),
  nickname: z.string(),
  tag: z.string(),
});
```

### 2. 서버 Targeted Relay 패턴

```typescript
// SignalingServer.ts - handleMessage switch 확장
case MessageType.CHAT_REQUEST:
  this.handleChatRequest(ws, msg);
  break;
case MessageType.CHAT_MESSAGE:
  this.handleChatMessage(ws, msg);
  break;

// targeted send
private handleChatMessage(ws: AliveWebSocket, msg: ChatMessagePayload): void {
  const session = this.chatSessions.getByUser(ws.userId!);
  if (!session) return; // 세션 없으면 무시

  const targetId = session.userA === ws.userId ? session.userB : session.userA;
  this.sendToUser(targetId, {
    type: MessageType.CHAT_MSG,
    sessionId: session.id,
    from: { nickname: /* from ws.userId parse */, tag: /* ... */ },
    content: msg.content,
    timestamp: Date.now(),
  });
  // 메시지 내용 로깅/저장 금지
}
```

### 3. 터미널 벨 알림

```typescript
// 간단한 터미널 벨 구현
function ringBell(): void {
  if (process.stdout.isTTY) {
    process.stdout.write('\x07');
  }
}

// useChatSession hook 내에서 메시지 수신 시 호출
// "포커스가 없을 때만" 조건은 Ink의 useStdin isFocused 또는
// process.stdout.hasColors 등으로는 판별 불가 —
// 현실적으로 매 수신 메시지마다 벨을 울리되,
// 자신의 메시지에는 울리지 않는 방식이 가장 실용적
```

### 4. 채팅 요청 오버레이 (UserList 패턴 재사용)

```typescript
// ChatRequestOverlay.tsx - UserList 패턴 참조
// UserList의 useInput({ isActive: visible }) 패턴을 그대로 활용
interface ChatRequestOverlayProps {
  request: { sessionId: string; from: NearbyUser } | null;
  onAccept: () => void;
  onDecline: () => void;
}

// Enter = 수락, Escape = 거절
// visible = request !== null
```

### 5. 입력 비활성화 패턴

```typescript
// IMETextInput에 disabled prop 추가
// isActive: false 전달 시 useInput이 비활성화됨
// 시각적으로: placeholder를 "연결 끊김..." 등으로 변경 + dimColor
<IMETextInput
  onSubmit={handleSubmit}
  placeholder={isDisconnected ? "Connection lost..." : "Type a message or /help..."}
  isActive={!isDisconnected}
/>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Socket.IO rooms | ws + 수동 라우팅 | 프로젝트 초기 결정 | Socket.IO의 auto-reconnect 등 편의 기능 없음, 대신 번들 크기 절감 |
| 전역 이벤트 버스 | React hooks + EventEmitter | Phase 2 확립 | 컴포넌트 단위 이벤트 구독, 메모리 누수 방지 (cleanup) |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest (latest) |
| Config file | `/vitest.config.ts` (root level) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MESG-01 | 채팅 요청/수락/메시지 relay | integration | `npx vitest run packages/server/src/__tests__/ChatRelay.test.ts -x` | Wave 0 |
| MESG-01 | 채팅 프로토콜 스키마 검증 | unit | `npx vitest run packages/shared/src/__tests__/chatProtocol.test.ts -x` | Wave 0 |
| MESG-02 | 메시지 비저장 (서버 로깅 없음) | unit | `npx vitest run packages/server/src/__tests__/ChatRelay.test.ts -t "no message logging" -x` | Wave 0 |
| MESG-03 | 연결 끊김 시 상대방 알림 + 재연결 후 세션 복구 | integration | `npx vitest run packages/server/src/__tests__/ChatRelay.test.ts -t "disconnect" -x` | Wave 0 |
| SOCL-04 | 터미널 벨 발동 조건 | unit | `npx vitest run packages/client/src/__tests__/chatNotification.test.ts -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `packages/shared/src/__tests__/chatProtocol.test.ts` -- 채팅 메시지 스키마 유효성 (REQ MESG-01)
- [ ] `packages/server/src/__tests__/ChatRelay.test.ts` -- 채팅 relay 통합 테스트 (REQ MESG-01, MESG-02, MESG-03)
- [ ] `packages/client/src/__tests__/chatNotification.test.ts` -- 벨 알림 조건 (REQ SOCL-04)

## Open Questions

1. **터미널 포커스 감지 한계**
   - What we know: `\x07` 터미널 벨은 구현이 간단. CONTEXT.md에서 "포커스가 없을 때만" 알림으로 결정.
   - What's unclear: Node.js에서 터미널 탭 포커스를 확인하는 표준 방법이 없음. xterm의 `\x1b[?1004h` (focus events) 지원이 터미널마다 다름.
   - Recommendation: 실용적 접근 — 상대방 메시지 수신 시 항상 벨을 울림. 사용자가 이미 보고 있어도 벨이 울리는 것은 TUI 채팅의 일반적 동작. 또는 간단한 "last input timestamp" 기반으로 N초 이상 입력이 없으면 벨을 울리는 휴리스틱.

2. **재연결 후 채팅 세션 자동 복구 범위**
   - What we know: 메시지 유실은 허용됨 (CONTEXT.md). 재연결 시 REGISTER로 재등록.
   - What's unclear: 재연결 후 기존 세션을 자동 복구할지, 아니면 사용자가 다시 /users에서 선택해야 하는지.
   - Recommendation: 재연결 성공 시 자동으로 CHAT_REQUEST를 이전 상대방에게 재전송. 상대방이 여전히 온라인이면 자동 수락 (재연결이므로). 실패하면 시스템 메시지 표시.

## Sources

### Primary (HIGH confidence)
- `packages/shared/src/protocol.ts` -- 기존 zod discriminated union 패턴, MessageType 정의
- `packages/server/src/SignalingServer.ts` -- 메시지 핸들링 패턴, broadcastToRegistered, send, handleClose
- `packages/server/src/PresenceManager.ts` -- getUser(id) 메서드로 targeted relay 가능
- `packages/client/src/network/SignalingClient.ts` -- EventEmitter 이벤트 패턴, reconnect 로직
- `packages/client/src/hooks/useServerConnection.ts` + `useNearbyUsers.ts` -- hook 패턴
- `packages/client/src/ui/screens/ChatScreen.tsx` -- 현재 화면 구조, UserList 오버레이 통합
- `packages/client/src/ui/components/UserList.tsx` -- 오버레이 + useInput isActive 패턴
- `.claude/rules/protocol-design.md` -- 메시지 저장 금지, zod schema 선행 규칙
- `.claude/rules/p2p-networking.md` -- relay-first, heartbeat, 재연결 규칙

### Secondary (MEDIUM confidence)
- `.planning/research/ARCHITECTURE.md` -- relay fallback flow 설계, EventEmitter 내부 버스 패턴
- `.planning/research/PITFALLS.md` -- WebSocket silent death, reconnection 패턴

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - 새 패키지 추가 불필요, 기존 스택만 확장
- Architecture: HIGH - 기존 코드 패턴이 명확하고 확장 지점이 잘 정의됨
- Pitfalls: HIGH - 채팅 세션 관리의 엣지 케이스는 서버 측 세션 tracking으로 해결
- Protocol design: HIGH - zod discriminated union 확장은 기존 패턴의 직접적 연장

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (안정적 스택, 새 의존성 없음)
