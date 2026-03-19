# Phase 4: Friends - Research

**Researched:** 2026-03-19
**Domain:** Friend list management, persistent local storage, server-side friend status tracking
**Confidence:** HIGH

## Summary

Phase 4는 nick#tag 기반 친구 추가/삭제와 persistent 친구 목록을 구현한다. 핵심은 세 영역: (1) 로컬 친구 목록 저장(`conf` 라이브러리 확장), (2) 프로토콜 확장(friend status 요청/응답 메시지), (3) TUI(FriendList 오버레이 + 상태바 확장).

기존 코드베이스가 매우 잘 구조화되어 있어 확장이 직관적이다. `AppConfig`에 friends 필드 추가, `protocol.ts`에 friend 메시지 타입 추가, `UserList` 패턴을 복제한 `FriendList` 컴포넌트 작성이 핵심 작업이다. 서버는 클라이언트가 전송한 friend list의 online/offline 상태만 조회하여 반환하며, 친구 목록을 서버에 저장하지 않는다.

**Primary recommendation:** Protocol-first로 shared에 friend 메시지 스키마 정의 후, server handler와 client를 동시에 확장. FriendList UI는 UserList 패턴을 그대로 따른다.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- 일방적 추가 (Twitter follow 방식) -- 상대방 수락 불필요, 알림 없음
- `/friends` 명령어로 오버레이 표시 (UserList와 동일 패턴)
- 표시 정보: nick#tag | [AI CLI badge] | [online/offline] 상태
- 정렬: online 먼저 -> offline, 각 그룹 내 알파벳순
- 화살표 선택 -> Enter로 채팅 시작 (online인 친구만)
- 클라이언트가 서버에 등록 시 친구 목록(nick#tag 배열)도 전송
- 서버가 친구의 online/offline 상태를 추적하여 실시간 업데이트 전송
- 서버에 친구 목록 저장 금지
- `/addfriend <nick#tag>`, `/removefriend <nick#tag>` 명령어
- `conf` 라이브러리 확장하여 friends 배열 저장
- 저장 형식: `{ nickname: string; tag: string; addedAt: string }[]`
- 상태바에 `Friends: 2/5 online` 표시 (0명이면 생략)

### Claude's Discretion
- 프로토콜 메시지 타입 설계 (FRIEND_STATUS_REQUEST, FRIEND_STATUS_UPDATE 등)
- 서버 측 친구 상태 조회 구현 세부사항
- FriendList 컴포넌트 내부 UI 디자인
- 친구 상태 업데이트 주기/이벤트 방식
- 입력 검증 세부 로직

### Deferred Ideas (OUT OF SCOPE)
- 원격 친구 P2P 직접 연결 -- Phase 5 (SOCL-03)
- 친구 요청/수락 양방향 모델
- 친구 그룹/카테고리 -- v2 scope
- 친구 닉네임 변경 감지
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SOCL-01 | 고유ID(nick#tag)로 위치 무관 친구추가/삭제 | AppConfig 확장 + `/addfriend`/`/removefriend` 명령어 + FriendManager 모듈 |
| SOCL-02 | 친구 목록 로컬 파일 저장 (세션 간 유지) | `conf` 라이브러리 기존 패턴 활용, friends 필드 추가 |
</phase_requirements>

## Standard Stack

### Core (이미 프로젝트에 존재)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| conf | latest | XDG-compliant 로컬 설정 저장 | 이미 AppConfig에서 Identity 저장에 사용 중. friends 필드만 추가 |
| zod | ^3.24 | 프로토콜 메시지 검증 | 기존 protocol.ts 패턴 그대로 확장 |
| ink | ^6.8.0 | TUI 컴포넌트 | FriendList = UserList 동일 패턴 |
| ws | ^8.19.0 | WebSocket 통신 | 기존 SignalingClient/Server 확장 |

### Supporting
새로운 라이브러리 추가 불필요. 모든 기능이 기존 스택으로 구현 가능.

### Alternatives Considered
없음. 모든 결정이 CONTEXT.md에서 잠겨있으며, 기존 스택으로 충분.

## Architecture Patterns

### 확장 대상 파일 구조
```
packages/
  shared/src/
    types.ts           # + FriendRecord 타입
    protocol.ts        # + FRIEND_STATUS_* 메시지 타입 및 스키마
    constants.ts       # + FRIEND_STATUS 상수 (필요 시)
  client/src/
    config/AppConfig.ts        # + friends 필드
    commands/CommandParser.ts   # + /addfriend, /removefriend
    network/SignalingClient.ts  # + friendStatus 이벤트 emit, requestFriendStatus()
    hooks/useFriends.ts         # 새 파일: 친구 목록 관리 hook
    ui/components/FriendList.tsx # 새 파일: 오버레이 컴포넌트
    ui/components/StatusBar.tsx  # + onlineFriends 표시
    ui/screens/ChatScreen.tsx    # + showFriendList 상태, 명령어 라우팅
  server/src/
    PresenceManager.ts    # + getUserByIdentity(nick, tag) 메서드
    SignalingServer.ts    # + FRIEND_STATUS_REQUEST 핸들러
```

### Pattern 1: Protocol-First Friend Status
**What:** shared/protocol.ts에 friend 관련 메시지 스키마를 먼저 정의하고, 서버/클라이언트가 동일 스키마 사용
**When to use:** 새 메시지 타입 추가 시 항상

**Recommended message types:**

```typescript
// Client -> Server
FRIEND_STATUS_REQUEST = 'friend_status_request'
// 클라이언트가 등록 후 친구 목록의 상태 일괄 조회
// { type, friends: Array<{ nickname: string, tag: string }> }

// Server -> Client
FRIEND_STATUS_RESPONSE = 'friend_status_response'
// 친구들의 현재 online/offline 상태 일괄 응답
// { type, statuses: Array<{ nickname: string, tag: string, status: 'online' | 'offline' | 'unknown' }> }

FRIEND_STATUS_UPDATE = 'friend_status_update'
// 친구의 상태가 변경되었을 때 개별 push
// { type, nickname: string, tag: string, status: 'online' | 'offline' }
```

**Design rationale:**
- `FRIEND_STATUS_REQUEST`: 초기 로딩 + 재연결 시 일괄 조회
- `FRIEND_STATUS_RESPONSE`: 요청에 대한 일괄 응답
- `FRIEND_STATUS_UPDATE`: 실시간 개별 push (친구가 접속/종료 시)

### Pattern 2: Event-Driven Friend Status Updates
**What:** 서버가 USER_JOINED/USER_LEFT 이벤트 처리 시, 해당 사용자를 친구로 등록한 클라이언트에게 FRIEND_STATUS_UPDATE push
**When to use:** 친구가 서버에 접속하거나 종료할 때

**Server-side implementation approach:**
```typescript
// SignalingServer에서 관리
// Map<userId, Set<friendUserId>> - 어떤 클라이언트가 어떤 친구를 추적하는지
// 이 맵은 FRIEND_STATUS_REQUEST 수신 시 구성
// 사용자 disconnection 시 맵에서 제거

// handleRegister 또는 별도 FRIEND_STATUS_REQUEST에서:
// 클라이언트가 보낸 friends 배열로 구독 맵 구성
// 이후 USER_JOINED/USER_LEFT 시 구독자에게 FRIEND_STATUS_UPDATE push
```

### Pattern 3: FriendManager Local Module
**What:** 친구 추가/삭제/조회를 담당하는 순수 모듈 (React 무관)
**When to use:** 비즈니스 로직을 UI에서 분리할 때

```typescript
// packages/client/src/friends/FriendManager.ts
import { appConfig } from '../config/AppConfig.js';

export interface FriendRecord {
  nickname: string;
  tag: string;
  addedAt: string; // ISO 8601
}

export function getFriends(): FriendRecord[] {
  return appConfig.get('friends') ?? [];
}

export function addFriend(nickname: string, tag: string): FriendRecord {
  const friends = getFriends();
  const record: FriendRecord = { nickname, tag, addedAt: new Date().toISOString() };
  appConfig.set('friends', [...friends, record]);
  return record;
}

export function removeFriend(nickname: string, tag: string): boolean {
  const friends = getFriends();
  const filtered = friends.filter(f => !(f.nickname === nickname && f.tag === tag));
  if (filtered.length === friends.length) return false;
  appConfig.set('friends', filtered);
  return true;
}

export function isFriend(nickname: string, tag: string): boolean {
  return getFriends().some(f => f.nickname === nickname && f.tag === tag);
}
```

### Pattern 4: useFriends Hook (useNearbyUsers 패턴 참조)
**What:** SignalingClient 이벤트를 구독하여 친구 상태를 React state로 관리
**When to use:** ChatScreen에서 친구 목록 + 온라인 상태 필요할 때

```typescript
// 핵심 구조
export function useFriends(client: SignalingClient | null, status: ConnectionStatus) {
  const [friendStatuses, setFriendStatuses] = useState<FriendStatus[]>([]);

  // connected 시 FRIEND_STATUS_REQUEST 전송
  useEffect(() => {
    if (status !== 'connected' || !client) return;
    const friends = getFriends();
    if (friends.length > 0) {
      client.requestFriendStatus(friends.map(f => ({ nickname: f.nickname, tag: f.tag })));
    }
  }, [client, status]);

  // friend_status_response, friend_status_update 이벤트 구독
  // ...
}
```

### Anti-Patterns to Avoid
- **서버에 친구 목록 저장:** 프라이버시 정책 위반. 매 세션 클라이언트가 전송
- **REGISTER 메시지에 friends 포함:** REGISTER 스키마 변경은 기존 클라이언트와 호환성 문제. 별도 FRIEND_STATUS_REQUEST 메시지 사용
- **FriendList에서 직접 appConfig 접근:** FriendManager 모듈을 통해 간접 접근하여 테스트 용이성 확보
- **friend status를 polling으로 구현:** 이벤트 push 방식이 효율적. 서버가 접속/퇴장 시 push

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| XDG 설정 저장 | 직접 fs.readFile/writeFile | `conf` 라이브러리 (AppConfig) | OS별 경로 처리, atomic write, JSON schema 지원 |
| nick#tag 파싱 | 직접 split('#') | 정규식 + zod schema | 엣지 케이스(#이 닉네임에 포함될 수 있음) 방어 |
| 오버레이 UI | 커스텀 렌더링 | UserList 패턴 복제 | 키보드 네비게이션, 스타일 일관성 |

## Common Pitfalls

### Pitfall 1: REGISTER 스키마 변경 시 하위 호환성
**What goes wrong:** REGISTER에 friends 필드를 필수로 추가하면 기존 클라이언트가 접속 불가
**Why it happens:** discriminatedUnion에서 스키마 불일치 시 파싱 실패
**How to avoid:** REGISTER는 그대로 두고, 연결 후 별도 FRIEND_STATUS_REQUEST 메시지 전송
**Warning signs:** clientMessageSchema.safeParse 실패 로그

### Pitfall 2: 친구 상태 구독 맵 메모리 누수
**What goes wrong:** 사용자 disconnect 시 구독 맵에서 제거하지 않으면 메모리 누수
**Why it happens:** handleClose에서 friend subscription 정리 누락
**How to avoid:** handleClose에서 반드시 friendSubscriptions 맵 정리
**Warning signs:** 서버 메모리 지속 증가

### Pitfall 3: 친구 추가 시 자기 자신 체크
**What goes wrong:** 자기 nick#tag을 친구로 추가
**Why it happens:** 입력 검증 누락
**How to avoid:** addFriend 전에 identity와 비교

### Pitfall 4: nick#tag 파싱 엣지 케이스
**What goes wrong:** `user#name#3A7F` 같은 입력에서 잘못된 파싱
**Why it happens:** 단순 split('#')은 여러 # 처리 불가
**How to avoid:** 마지막 #을 기준으로 분리하거나, 정규식 `/^(.+)#([0-9A-F]{4})$/` 사용
**Warning signs:** 잘못된 tag 값

### Pitfall 5: conf 타입 확장 시 기존 데이터 호환
**What goes wrong:** AppConfig 스키마 변경 시 기존 설정 파일에 friends 필드 없음
**Why it happens:** conf는 기존 파일을 그대로 읽음
**How to avoid:** `appConfig.get('friends') ?? []` 로 undefined 처리

### Pitfall 6: 재연결 시 친구 상태 갱신 누락
**What goes wrong:** 서버 재연결 후 친구 상태가 업데이트되지 않음
**Why it happens:** connected 이벤트에서 FRIEND_STATUS_REQUEST 재전송 누락
**How to avoid:** useFriends hook에서 status === 'connected' 변경 감지 시 재요청

## Code Examples

### nick#tag 파싱 유틸리티
```typescript
// packages/shared/src/types.ts에 추가
export const NICK_TAG_REGEX = /^(.+)#([0-9A-F]{4})$/;

export function parseNickTag(input: string): { nickname: string; tag: string } | null {
  const match = input.match(NICK_TAG_REGEX);
  if (!match) return null;
  return { nickname: match[1]!, tag: match[2]! };
}
```

### AppConfig friends 필드 확장
```typescript
// packages/client/src/config/AppConfig.ts
export const appConfig = new Conf<{
  identity?: Identity;
  friends?: FriendRecord[];
}>({
  projectName,
});
```

### FRIEND_STATUS_REQUEST 프로토콜 스키마
```typescript
// packages/shared/src/protocol.ts에 추가
export const friendStatusRequestSchema = z.object({
  type: z.literal(MessageType.FRIEND_STATUS_REQUEST),
  friends: z.array(z.object({
    nickname: z.string(),
    tag: z.string(),
  })),
});

export const friendStatusResponseSchema = z.object({
  type: z.literal(MessageType.FRIEND_STATUS_RESPONSE),
  statuses: z.array(z.object({
    nickname: z.string(),
    tag: z.string(),
    status: z.enum(['online', 'offline', 'unknown']),
    aiCli: z.enum(AI_CLI_OPTIONS).optional(),
  })),
});

export const friendStatusUpdateSchema = z.object({
  type: z.literal(MessageType.FRIEND_STATUS_UPDATE),
  nickname: z.string(),
  tag: z.string(),
  status: z.enum(['online', 'offline']),
});
```

### 서버 Friend Subscription 관리
```typescript
// SignalingServer 내부
// friendSubscriptions: Map<userId, string[]> - 각 유저가 추적하는 friend userId 목록
private friendSubscriptions = new Map<string, string[]>();

private handleFriendStatusRequest(ws: AliveWebSocket, friends: Array<{nickname: string, tag: string}>): void {
  const friendIds = friends.map(f => `${f.nickname}#${f.tag}`);
  this.friendSubscriptions.set(ws.userId!, friendIds);

  const statuses = friends.map(f => {
    const userId = `${f.nickname}#${f.tag}`;
    const user = this.presenceManager.getUser(userId);
    return {
      nickname: f.nickname,
      tag: f.tag,
      status: user ? user.status : 'unknown' as const,
      ...(user ? { aiCli: user.aiCli } : {}),
    };
  });

  this.send(ws, {
    type: MessageType.FRIEND_STATUS_RESPONSE,
    statuses,
  });
}
```

### Friend Status Push on Join/Leave
```typescript
// handleRegister 끝에 추가:
// 새로 접속한 사용자를 친구로 추적하는 클라이언트들에게 push
private notifyFriendSubscribers(userId: string, status: 'online' | 'offline'): void {
  const [nickname, tag] = this.splitUserId(userId);
  for (const [subscriberId, friendIds] of this.friendSubscriptions) {
    if (friendIds.includes(userId)) {
      this.sendToUser(subscriberId, {
        type: MessageType.FRIEND_STATUS_UPDATE,
        nickname,
        tag,
        status,
      });
    }
  }
}
```

## State of the Art

이 Phase는 새 기술 도입이 없다. 모든 구현이 기존 Phase 1-3에서 확립된 패턴을 따른다.

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| N/A | conf 라이브러리로 로컬 저장 | Phase 1에서 확립 | friends도 동일 패턴 |
| N/A | Protocol-first zod 스키마 | Phase 2에서 확립 | friend 메시지도 동일 패턴 |
| N/A | UserList 오버레이 패턴 | Phase 2에서 확립 | FriendList도 동일 패턴 |

## Open Questions

1. **친구 목록 전송 시점**
   - What we know: REGISTER 후 별도 FRIEND_STATUS_REQUEST로 전송
   - What's unclear: REGISTER 응답(REGISTERED) 수신 직후 자동 전송 vs 수동 트리거
   - Recommendation: `connected` 이벤트 핸들러에서 자동 전송. useFriends hook이 status 변경 감지

2. **Friend status push 효율성**
   - What we know: 서버가 접속/퇴장 시 구독자에게 push
   - What's unclear: 대규모 사용자 시 O(N*M) broadcast 비용
   - Recommendation: v1에서는 단순 iteration으로 충분. 사용자 수 제한적(CLI 도구). 최적화는 추후

3. **REGISTER와 FRIEND_STATUS_REQUEST 순서**
   - What we know: REGISTER 후 REGISTERED 수신, 그 다음 FRIEND_STATUS_REQUEST 전송
   - What's unclear: 동시 전송 시 서버 race condition
   - Recommendation: REGISTERED 수신 후 전송 (connected 이벤트 기준). 기존 코드에서 connected 이벤트가 REGISTERED 수신 시 emit됨 (SignalingClient.ts:137)

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest (latest) |
| Config file | `/vitest.config.ts` (root) |
| Quick run command | `npm test -- --run` |
| Full suite command | `npm test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SOCL-01 | nick#tag으로 친구 추가/삭제 | unit | `npx vitest run packages/client/src/friends/FriendManager.test.ts -t "add/remove"` | Wave 0 |
| SOCL-01 | 잘못된 nick#tag 형식 거부 | unit | `npx vitest run packages/shared/src/__tests__/friendProtocol.test.ts -t "validation"` | Wave 0 |
| SOCL-01 | 자기 자신 추가 차단 | unit | `npx vitest run packages/client/src/friends/FriendManager.test.ts -t "self"` | Wave 0 |
| SOCL-01 | /addfriend, /removefriend 명령어 파싱 | unit | `npx vitest run packages/client/src/commands/CommandParser.test.ts` | Existing (extend) |
| SOCL-02 | 친구 목록 conf 저장/로드 | unit | `npx vitest run packages/client/src/friends/FriendManager.test.ts -t "persist"` | Wave 0 |
| SOCL-01 | 서버 friend status 조회 | unit | `npx vitest run packages/server/src/__tests__/FriendStatus.test.ts` | Wave 0 |
| SOCL-01 | 친구 상태 실시간 push | unit | `npx vitest run packages/server/src/__tests__/FriendStatus.test.ts -t "push"` | Wave 0 |
| SOCL-01 | 프로토콜 스키마 검증 | unit | `npx vitest run packages/shared/src/__tests__/friendProtocol.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `packages/client/src/friends/FriendManager.test.ts` -- SOCL-01, SOCL-02 unit tests
- [ ] `packages/shared/src/__tests__/friendProtocol.test.ts` -- friend protocol schema validation
- [ ] `packages/server/src/__tests__/FriendStatus.test.ts` -- server friend status handler tests

## Sources

### Primary (HIGH confidence)
- 프로젝트 코드 직접 분석 -- protocol.ts, AppConfig.ts, SignalingClient.ts, SignalingServer.ts, UserList.tsx, ChatScreen.tsx 등 모든 확장 대상 파일
- CONTEXT.md -- 사용자 결정사항 (locked decisions)
- CLAUDE.md -- 프로젝트 규칙 (protocol-first, 메시지 저장 금지, ESM-only)

### Secondary (MEDIUM confidence)
- conf 라이브러리 사용 패턴 -- AppConfig.ts 기존 코드에서 검증됨

### Tertiary (LOW confidence)
없음 -- 모든 연구가 프로젝트 코드 직접 분석에 기반

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - 새 라이브러리 추가 없음, 기존 스택 확장만
- Architecture: HIGH - 기존 패턴(protocol-first, EventEmitter, React hooks, overlay) 그대로 적용
- Pitfalls: HIGH - 코드 직접 분석으로 확인 (스키마 호환성, 메모리 누수, 입력 검증)

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (stable -- 기존 패턴 재활용, 외부 의존성 변경 없음)
