# Phase 2: Signaling & Discovery - Research

**Researched:** 2026-03-19
**Domain:** WebSocket signaling server + IP geolocation + presence management
**Confidence:** HIGH

## Summary

Phase 2는 `packages/server/` 패키지를 새로 생성하고, ws WebSocket 서버로 사용자 등록/발견/presence를 구현하며, 클라이언트에 SignalingClient를 추가하여 서버와 통신하는 것이 핵심이다. geoip-lite로 서버 사이드 IP geolocation을 수행하고, haversine으로 거리 계산 후 범위 필터링한다.

서버 패키지(`packages/server/`)는 아직 존재하지 않으므로 Phase 2에서 새로 생성해야 한다. 클라이언트 측은 Phase 1에서 구축된 Ink TUI(ChatScreen, StatusBar, CommandParser)를 확장하여 서버 연결 상태 표시, `/users` 명령어 구현, 범위 전환 단축키를 추가한다.

**Primary recommendation:** Protocol-first로 shared 패키지에 메시지 타입/스키마를 먼저 정의하고, 서버와 클라이언트를 동시에 구현. `npm run dev`로 서버+클라이언트 동시 기동 가능한 개발 환경을 우선 세팅.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Phase 2는 로컬 개발 환경만 (배포는 모든 Phase 완료 후 Fly.io)
- `npm run dev`로 서버+클라이언트 동시 기동 (단일 명령어)
- 채팅 테스트 시 다른 터미널에서 클라이언트 추가 실행
- 서버 주소: 기본값 `ws://localhost:3456` + 환경변수(`CLING_TALK_SERVER`)로 변경 가능
- `/users` = 근처 접속자 목록 (IP geolocation 반경 내 모든 접속자)
- `/friends` = 내가 추가한 친구 목록 (Phase 4에서 구현)
- `/users` 실행 시: 테이블 형식 표시 (nick#tag | [AI CLI] | 거리 | 상태)
- 사용자 선택: `/users` -> Enter -> 화살표 위/아래로 선택 -> Enter로 대화 시작
- 목록 정렬: 거리순 (가까운 사용자가 위)
- 빈 상태: "No users nearby. Try expanding radius" 메시지 + 범위 확대 제안
- 상태바에서 단축키로 범위 순환 (1->3->5->10->1km)
- 상태바에 현재 범위 표시
- 상태 표시: [online] / [offline] 텍스트 태그
- heartbeat 간격: 30초
- 오프라인 감지: 1분간 응답 없으면 offline 처리
- 상태바에 내 연결 상태: connected / reconnecting / offline
- 연결/끊김/재연결 시: 상태바 텍스트 변경 + 채팅 영역에 시스템 메시지
- 재연결: exponential backoff + jitter (500ms -> 30s cap)

### Claude's Discretion
- WebSocket 서버 포트 번호 (기본 3456 제안)
- geoip-lite DB 업데이트 전략
- 서버 내부 데이터 구조 (인메모리 사용자 맵)
- heartbeat ping/pong 구현 세부사항
- 범위 전환 단축키 선택

### Deferred Ideas (OUT OF SCOPE)
- 서버 배포 (Fly.io) -- 모든 Phase 완료 후
- VPN 감지 및 경고 -- 서버 구현 후 정확도 확인 후 판단
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DISC-01 | 신호 서버가 IP geolocation으로 사용자 위치 파악 | geoip-lite lookup API (`geo.ll` 좌표), 서버사이드 `req.socket.remoteAddress` |
| DISC-02 | 근처 사용자 목록 조회 (메트로/도시 수준 정확도) | haversine 거리 계산, 인메모리 사용자 맵 순회, NearbyUser 응답 타입 |
| DISC-03 | 거리 범위 필터 선택 (1/3/5/10km) | 클라이언트 radius 상태 관리, 서버에 radius 파라미터 전송 |
| IDEN-03 | 온라인/오프라인 상태가 다른 사용자에게 실시간 표시 | 30초 heartbeat, 1분 타임아웃, presence broadcast 패턴 |
</phase_requirements>

## Standard Stack

### Core (Phase 2 신규 추가)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ws | 8.19.0 | WebSocket 서버 | Node.js 생태계 표준. 경량, 빠름. ping/pong 내장 지원 |
| geoip-lite | 2.0.1 | IP -> 위도/경도 변환 | 외부 API 호출 없이 로컬 MaxMind DB 조회. < 0.5us/lookup |
| haversine | 1.1.1 | 두 좌표 간 거리 계산 (km) | 단순하고 정확한 great-circle distance 계산 |

### Supporting (Phase 2 신규 추가)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| tsx | latest | 개발 시 TypeScript 직접 실행 | 서버 개발 중 빠른 재시작 (`tsx watch`) |
| concurrently | latest | 여러 명령어 동시 실행 | `npm run dev`에서 서버+클라이언트 동시 기동 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| geoip-lite (로컬 DB) | ip-api.com (외부 API) | 더 정확하지만 rate limit (45req/min), 네트워크 의존 |
| haversine (npm) | 직접 haversine 공식 구현 | 패키지가 4줄 수준으로 작지만, 검증된 구현 사용이 안전 |
| concurrently | npm-run-all2 | 거의 동일. concurrently가 더 활발히 유지보수 |

**Installation:**
```bash
# server 패키지
cd packages/server
npm install ws geoip-lite haversine zod
npm install -D @types/ws @types/geoip-lite @types/haversine typescript tsx vitest

# root에서 dev 스크립트용
npm install -D concurrently --workspace-root
```

**Version verification:** ws@8.19.0, geoip-lite@2.0.1, haversine@1.1.1 -- 2026-03-19 npm registry 확인 완료.

## Architecture Patterns

### Recommended Project Structure (Phase 2 추가분)

```
packages/
  server/                     # [NEW] 경량 신호 서버
    src/
      index.ts               # 서버 진입점
      SignalingServer.ts      # WebSocket 서버 + 메시지 라우팅
      PresenceManager.ts      # 사용자 등록/해제, heartbeat 추적
      GeoLocationService.ts   # IP -> 좌표, 거리 계산, 범위 필터링
      types.ts                # 서버 내부 타입 (UserRecord 등)
    package.json
    tsconfig.json

  shared/src/
    protocol.ts              # [NEW] 서버-클라이언트 메시지 타입 + zod 스키마
    constants.ts             # [EXTEND] 서버 관련 상수 추가

  client/src/
    network/
      SignalingClient.ts     # [NEW] WebSocket 클라이언트, 재연결, heartbeat
    hooks/
      useServerConnection.ts # [NEW] React hook: 연결 상태 관리
      useNearbyUsers.ts      # [NEW] React hook: 근처 사용자 목록
    ui/
      components/
        StatusBar.tsx         # [MODIFY] 연결 상태 + 범위 표시 추가
        UserList.tsx          # [NEW] /users 인터랙티브 테이블
      screens/
        ChatScreen.tsx        # [MODIFY] 서버 연결 통합, /users 오버레이
    commands/
      CommandParser.ts        # [MODIFY] /radius 명령 추가 가능 (또는 단축키만)
```

### Pattern 1: Protocol-First Message Design

**What:** 모든 WebSocket 메시지를 `packages/shared/src/protocol.ts`에 zod schema로 정의
**When to use:** client-server 메시지 교환 시 항상
**Example:**
```typescript
// packages/shared/src/protocol.ts
import { z } from 'zod';
import { AI_CLI_OPTIONS } from './types.js';

// Message type discriminant
export const MessageType = {
  // Client -> Server
  REGISTER: 'register',
  HEARTBEAT: 'heartbeat',
  GET_NEARBY: 'get_nearby',
  UPDATE_RADIUS: 'update_radius',

  // Server -> Client
  REGISTERED: 'registered',
  NEARBY_USERS: 'nearby_users',
  USER_JOINED: 'user_joined',
  USER_LEFT: 'user_left',
  USER_STATUS: 'user_status',
  ERROR: 'error',
} as const;

// Client -> Server messages
export const registerSchema = z.object({
  type: z.literal(MessageType.REGISTER),
  nickname: z.string().regex(/^[a-z0-9_-]{1,16}$/),
  tag: z.string().regex(/^[0-9A-F]{4}$/),
  aiCli: z.enum(AI_CLI_OPTIONS),
  protocolVersion: z.literal(1),
});

export const heartbeatSchema = z.object({
  type: z.literal(MessageType.HEARTBEAT),
});

export const getNearbySchema = z.object({
  type: z.literal(MessageType.GET_NEARBY),
  radiusKm: z.number().min(1).max(10),
});

// Server -> Client messages
export const nearbyUserSchema = z.object({
  nickname: z.string(),
  tag: z.string(),
  aiCli: z.enum(AI_CLI_OPTIONS),
  distance: z.number(),  // km
  status: z.enum(['online', 'offline']),
});

export const nearbyUsersResponseSchema = z.object({
  type: z.literal(MessageType.NEARBY_USERS),
  users: z.array(nearbyUserSchema),
});

// Discriminated union for all messages
export const clientMessageSchema = z.discriminatedUnion('type', [
  registerSchema,
  heartbeatSchema,
  getNearbySchema,
]);

export const serverMessageSchema = z.discriminatedUnion('type', [
  nearbyUsersResponseSchema,
  // ... other server messages
]);

export type ClientMessage = z.infer<typeof clientMessageSchema>;
export type ServerMessage = z.infer<typeof serverMessageSchema>;
export type NearbyUser = z.infer<typeof nearbyUserSchema>;
```

### Pattern 2: Server-Side User Registry (In-Memory Map)

**What:** 인메모리 Map으로 접속 사용자 관리. 서버 재시작 시 초기화 (의도적)
**When to use:** PresenceManager 구현 시
**Example:**
```typescript
// packages/server/src/PresenceManager.ts
import type { WebSocket } from 'ws';

interface UserRecord {
  nickname: string;
  tag: string;
  aiCli: string;
  lat: number;
  lon: number;
  ws: WebSocket;
  lastHeartbeat: number;
  status: 'online' | 'offline';
}

class PresenceManager {
  private users = new Map<string, UserRecord>();  // key: "nick#TAG"

  register(id: string, record: UserRecord): void { /* ... */ }
  unregister(id: string): void { /* ... */ }
  heartbeat(id: string): void {
    const user = this.users.get(id);
    if (user) user.lastHeartbeat = Date.now();
  }

  // 30초 간격으로 호출, 1분 이상 응답 없으면 offline
  checkStaleUsers(): string[] {
    const now = Date.now();
    const staleIds: string[] = [];
    for (const [id, user] of this.users) {
      if (now - user.lastHeartbeat > 60_000 && user.status === 'online') {
        user.status = 'offline';
        staleIds.push(id);
      }
    }
    return staleIds;  // broadcast 대상
  }
}
```

### Pattern 3: Exponential Backoff + Jitter Reconnection

**What:** 클라이언트 WebSocket 재연결 전략
**When to use:** SignalingClient에서 연결 끊김 감지 시
**Example:**
```typescript
// packages/client/src/network/SignalingClient.ts
class SignalingClient {
  private ws: WebSocket | null = null;
  private reconnectAttempt = 0;
  private readonly maxDelay = 30_000;  // 30s cap
  private readonly baseDelay = 500;     // 500ms start

  private getReconnectDelay(): number {
    const expDelay = Math.min(
      this.baseDelay * Math.pow(2, this.reconnectAttempt),
      this.maxDelay,
    );
    // Jitter: 0.5x ~ 1.5x
    const jitter = 0.5 + Math.random();
    return Math.floor(expDelay * jitter);
  }

  private scheduleReconnect(): void {
    const delay = this.getReconnectDelay();
    this.reconnectAttempt++;
    setTimeout(() => this.connect(), delay);
  }
}
```

### Pattern 4: ws Heartbeat (Server-Side Ping/Pong)

**What:** ws 내장 ping/pong으로 연결 건강 확인 + 클라이언트 alive 상태 추적
**When to use:** SignalingServer heartbeat 구현
**Example:**
```typescript
// packages/server/src/SignalingServer.ts -- ws ping/pong pattern
// Source: https://github.com/websockets/ws#how-to-detect-and-close-broken-connections
import { WebSocketServer, WebSocket } from 'ws';

interface AliveWebSocket extends WebSocket {
  isAlive: boolean;
  userId?: string;
}

const wss = new WebSocketServer({ port: 3456 });

wss.on('connection', (ws: AliveWebSocket, req) => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  // 클라이언트 IP 획득 (geolocation용)
  const clientIp = req.socket.remoteAddress;

  ws.on('error', console.error);
  ws.on('close', () => { /* unregister user */ });
});

// 30초마다 ping, 응답 없으면 terminate
const heartbeatInterval = setInterval(() => {
  for (const client of wss.clients) {
    const ws = client as AliveWebSocket;
    if (!ws.isAlive) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    ws.ping();
  }
}, 30_000);

wss.on('close', () => clearInterval(heartbeatInterval));
```

### Pattern 5: GeoIP Lookup + Haversine Distance

**What:** 서버에서 IP로 좌표 조회 후 거리 계산
**Example:**
```typescript
// packages/server/src/GeoLocationService.ts
import geoip from 'geoip-lite';
import haversine from 'haversine';

interface GeoResult {
  lat: number;
  lon: number;
  city: string;
  country: string;
}

export function lookupIp(ip: string): GeoResult | null {
  const geo = geoip.lookup(ip);
  if (!geo || !geo.ll) return null;
  return {
    lat: geo.ll[0],
    lon: geo.ll[1],
    city: geo.city || 'Unknown',
    country: geo.country || 'Unknown',
  };
}

export function getDistanceKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  return haversine(
    { latitude: a.lat, longitude: a.lon },
    { latitude: b.lat, longitude: b.lon },
    { unit: 'km' },
  );
}

export function findNearbyUsers(
  origin: { lat: number; lon: number },
  users: Map<string, { lat: number; lon: number }>,
  radiusKm: number,
): Array<{ id: string; distance: number }> {
  const results: Array<{ id: string; distance: number }> = [];
  for (const [id, loc] of users) {
    const dist = getDistanceKm(origin, loc);
    if (dist <= radiusKm) {
      results.push({ id, distance: Math.round(dist * 10) / 10 });
    }
  }
  return results.sort((a, b) => a.distance - b.distance);
}
```

### Anti-Patterns to Avoid

- **클라이언트에서 geolocation API 직접 호출:** 클라이언트는 NAT 뒤에서 사설 IP만 보임. 반드시 서버가 WebSocket 연결의 `req.socket.remoteAddress`로 조회
- **사용자 목록에 IP 주소 포함:** NEARBY_USERS 응답에 절대 IP 포함 금지. nickname#tag + distance + status만 전달
- **heartbeat 없이 연결 상태 가정:** TCP keepalive 기본값 2시간. 반드시 30초 application-level heartbeat 구현
- **동기 geolocation lookup:** geoip-lite는 동기 API이지만 매우 빠름 (< 0.5us). 단, 첫 로드 시 메모리 135MB 할당 -- 서버 시작 시 한 번만 로드
- **UI 컴포넌트에서 직접 WebSocket 코드:** SignalingClient를 별도 클래스로 분리하고, React hook으로 래핑하여 UI에 제공

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| IP -> 좌표 변환 | HTTP API 클라이언트 | geoip-lite (로컬 DB) | 외부 API 의존성 제거, rate limit 없음, < 0.5us 조회 |
| 두 좌표 간 거리 | haversine 공식 직접 구현 | haversine npm | 검증된 구현, 단위 변환 내장 (km/mile/nmi) |
| WebSocket 서버 | net.createServer + HTTP upgrade | ws WebSocketServer | WebSocket 프로토콜 handshake, frame parsing, ping/pong 내장 |
| exponential backoff | setTimeout 수동 관리 | 패턴 코드 (위 예시) | 단순하므로 별도 라이브러리 불필요하나, jitter 포함 필수 |
| 동시 프로세스 실행 | shell script | concurrently | 크로스 플랫폼, 색상 구분, 프로세스 관리 |

**Key insight:** Phase 2의 핵심 복잡성은 라이브러리 선택이 아니라 "프로토콜 설계"와 "상태 동기화"에 있다. 라이브러리는 모두 단순하고 검증되어 있으므로, 설계에 시간을 투자해야 한다.

## Common Pitfalls

### Pitfall 1: localhost에서 geoip-lite가 null 반환

**What goes wrong:** 로컬 개발 시 `127.0.0.1`이나 `::1`을 geoip-lite에 전달하면 `null` 반환. 개발 중 "근처 사용자" 기능 테스트 불가.
**Why it happens:** geoip-lite는 공인 IP만 조회 가능. private/loopback IP는 DB에 없음.
**How to avoid:** 개발 환경에서 fallback 좌표 제공. 환경변수 또는 하드코딩된 기본 좌표 (예: 서울 시청 37.5665, 126.9780) 사용. 서버에 `DEV_GEO_LAT`/`DEV_GEO_LON` 환경변수 지원 추가.
**Warning signs:** 로컬 테스트에서 항상 빈 사용자 목록.

### Pitfall 2: WebSocket close 이벤트 미발생

**What goes wrong:** 네트워크 단절 시 `close` 이벤트가 즉시 발생하지 않음. 사용자가 오프라인인데 온라인으로 표시.
**Why it happens:** TCP는 깨끗한 연결 종료만 `close` 이벤트 발생. 네트워크 장애는 감지까지 수 분 소요.
**How to avoid:** ws ping/pong heartbeat (30초). `isAlive` 플래그로 dead connection 감지 및 `terminate()` 호출.
**Warning signs:** 사용자가 `Ctrl+C` 없이 터미널을 닫으면 서버에서 즉시 감지 안 됨.

### Pitfall 3: 재연결 시 중복 등록

**What goes wrong:** 클라이언트 재연결 시 이전 세션이 아직 서버에 남아있으면 동일 ID로 두 개의 세션 존재.
**Why it happens:** dead connection 정리 전에 새 연결이 들어옴.
**How to avoid:** REGISTER 메시지 수신 시 동일 ID의 기존 세션이 있으면 이전 WebSocket을 `terminate()` 후 새 세션으로 교체.
**Warning signs:** 사용자 목록에 같은 nick#tag가 2개 표시.

### Pitfall 4: geoip-lite 메모리 사용량

**What goes wrong:** geoip-lite 첫 로드 시 MaxMind DB를 메모리에 올려 ~135MB RSS 사용.
**Why it happens:** 인메모리 DB 방식의 트레이드오프. 빠른 조회 대신 메모리 사용.
**How to avoid:** 서버 프로세스에서만 로드 (클라이언트에 절대 포함하지 않음). 서버 환경에서 135MB는 수용 가능. 서버 시작 시 한 번만 로드되므로 런타임 성능 영향 없음.
**Warning signs:** 클라이언트 패키지에 geoip-lite가 의존성으로 들어감.

### Pitfall 5: IPv6 주소에서 city 정보 없음

**What goes wrong:** IPv6 주소로 geoip-lite 조회 시 country만 반환, city/좌표 없음.
**Why it happens:** geoip-lite 문서: "City, region and postal code lookups are only supported for IPv4."
**How to avoid:** IPv6 mapped IPv4 (::ffff:x.x.x.x)에서 IPv4 부분 추출. 순수 IPv6는 country-level fallback 또는 "location unavailable" 처리.
**Warning signs:** 일부 사용자가 좌표 없이 등록되어 거리 계산 불가.

## Code Examples

### WebSocket Server Bootstrap

```typescript
// packages/server/src/index.ts
import { SignalingServer } from './SignalingServer.js';

const PORT = parseInt(process.env.PORT || '3456', 10);
const server = new SignalingServer(PORT);

server.start();
console.log(`Signaling server listening on ws://localhost:${PORT}`);

// Graceful shutdown
process.on('SIGINT', () => {
  server.stop();
  process.exit(0);
});
process.on('SIGTERM', () => {
  server.stop();
  process.exit(0);
});
```

### Client WebSocket Connection Hook

```typescript
// packages/client/src/hooks/useServerConnection.ts
import { useState, useEffect, useRef } from 'react';
import { SignalingClient } from '../network/SignalingClient.js';
import type { Identity } from '@cling-talk/shared';

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'offline';

export function useServerConnection(identity: Identity) {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const clientRef = useRef<SignalingClient | null>(null);

  useEffect(() => {
    const serverUrl = process.env.CLING_TALK_SERVER || 'ws://localhost:3456';
    const client = new SignalingClient(serverUrl, identity);
    clientRef.current = client;

    client.on('connected', () => setStatus('connected'));
    client.on('reconnecting', () => setStatus('reconnecting'));
    client.on('disconnected', () => setStatus('offline'));

    client.connect();

    return () => { client.disconnect(); };
  }, [identity]);

  return { status, client: clientRef.current };
}
```

### StatusBar Extension (Phase 2 변경)

```typescript
// StatusBar에 연결 상태 + 범위 표시 추가
interface StatusBarProps {
  identity: Identity;
  connectionStatus: ConnectionStatus;
  radiusKm: number;
  nearbyCount: number;
}

// 범위 순환: 1 -> 3 -> 5 -> 10 -> 1
const RADIUS_OPTIONS = [1, 3, 5, 10] as const;
export function nextRadius(current: number): number {
  const idx = RADIUS_OPTIONS.indexOf(current as any);
  return RADIUS_OPTIONS[(idx + 1) % RADIUS_OPTIONS.length]!;
}
```

### Dev Script Setup

```json
// root package.json scripts 추가
{
  "scripts": {
    "dev": "concurrently -n server,client -c blue,green \"npm -w packages/server run dev\" \"npm -w packages/client run dev\"",
    "dev:server": "npm -w packages/server run dev",
    "dev:client": "npm -w packages/client run dev"
  }
}
```

```json
// packages/server/package.json
{
  "name": "@cling-talk/server",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsdown src/index.ts --format esm --out-dir dist",
    "test": "vitest run"
  },
  "dependencies": {
    "@cling-talk/shared": "*",
    "ws": "^8.19.0",
    "geoip-lite": "^2.0.1",
    "haversine": "^1.1.1",
    "zod": "^3.24"
  },
  "devDependencies": {
    "@types/ws": "^8",
    "@types/geoip-lite": "^1",
    "@types/haversine": "^1",
    "typescript": "^5.7",
    "tsx": "^4",
    "tsdown": "^0",
    "vitest": "^3"
  }
}
```

### IPv4 Extraction from IPv6 Mapped Address

```typescript
// packages/server/src/GeoLocationService.ts
export function normalizeIp(ip: string): string {
  // ::ffff:127.0.0.1 -> 127.0.0.1
  if (ip.startsWith('::ffff:')) {
    return ip.slice(7);
  }
  return ip;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ip-api.com 외부 호출 | geoip-lite 로컬 DB | N/A (프로젝트 결정) | rate limit 없음, 네트워크 독립, 135MB 메모리 트레이드오프 |
| socket.io 풀스택 | ws raw WebSocket | N/A (프로젝트 결정) | 오버헤드 제거, 직접 heartbeat/재연결 구현 필요 |
| 클라이언트 위치 보고 | 서버 IP 기반 위치 판단 | N/A (보안 결정) | 위치 스푸핑 방지, IP 노출 최소화 |

## Open Questions

1. **geoip-lite DB 업데이트**
   - What we know: MaxMind 무료 라이선스 키 필요, `npm run-script updatedb` 실행
   - What's unclear: Phase 2 개발 중 기본 포함 DB로 충분한지, 업데이트가 필요한지
   - Recommendation: 기본 DB로 시작, 정확도 문제 발생 시 업데이트. Claude's Discretion 영역

2. **다중 터미널 로컬 테스트에서 동일 IP 문제**
   - What we know: localhost에서 모든 클라이언트가 같은 IP -> 같은 좌표 -> 거리 0km
   - What's unclear: 로컬 테스트에서 다른 위치를 시뮬레이션하는 방법
   - Recommendation: 개발 모드에서 `CLING_TALK_DEV_OFFSET` 환경변수로 좌표 오프셋 지원, 또는 서버에 테스트용 랜덤 좌표 할당 옵션

3. **범위 전환 단축키 선택**
   - What we know: 상태바에서 단축키로 범위 순환
   - What's unclear: 어떤 키가 가장 직관적인지 (Tab? Ctrl+R? 숫자키?)
   - Recommendation: `Tab` 키 (Ink useInput에서 key.tab 감지 가능, 충돌 적음). Claude's Discretion 영역

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest ^3 |
| Config file | `vitest.config.ts` (root, 이미 존재) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DISC-01 | IP에서 좌표 조회 (geoip-lite) | unit | `npx vitest run packages/server/src/GeoLocationService.test.ts -t "lookupIp"` | -- Wave 0 |
| DISC-02 | 범위 내 사용자 필터링 + 거리순 정렬 | unit | `npx vitest run packages/server/src/GeoLocationService.test.ts -t "findNearby"` | -- Wave 0 |
| DISC-03 | 범위 변경 시 사용자 목록 갱신 | integration | `npx vitest run packages/server/src/SignalingServer.test.ts -t "radius"` | -- Wave 0 |
| IDEN-03 | heartbeat 타임아웃으로 offline 전환 | unit | `npx vitest run packages/server/src/PresenceManager.test.ts -t "stale"` | -- Wave 0 |
| N/A | 프로토콜 메시지 zod 스키마 검증 | unit | `npx vitest run packages/shared/src/protocol.test.ts` | -- Wave 0 |
| N/A | 클라이언트 재연결 backoff 계산 | unit | `npx vitest run packages/client/src/network/SignalingClient.test.ts -t "backoff"` | -- Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `packages/server/src/GeoLocationService.test.ts` -- DISC-01, DISC-02 커버
- [ ] `packages/server/src/PresenceManager.test.ts` -- IDEN-03 heartbeat/stale 커버
- [ ] `packages/server/src/SignalingServer.test.ts` -- DISC-03 integration 커버
- [ ] `packages/shared/src/protocol.test.ts` -- 프로토콜 스키마 검증
- [ ] `packages/client/src/network/SignalingClient.test.ts` -- 재연결 로직 커버
- [ ] `packages/server/tsconfig.json` -- 서버 TypeScript 설정
- [ ] `packages/server/package.json` -- 서버 패키지 의존성 설치

## Sources

### Primary (HIGH confidence)
- [ws GitHub README](https://github.com/websockets/ws) -- WebSocket 서버 생성, ping/pong heartbeat, 클라이언트 IP 획득 패턴
- [geoip-lite GitHub README](https://github.com/geoip-lite/node-geoip) -- lookup API, 반환 필드 (`ll`, `city`, `country`, `area`), IPv6 제한, 메모리 사용량
- npm registry (2026-03-19) -- ws@8.19.0, geoip-lite@2.0.1, haversine@1.1.1 버전 확인

### Secondary (MEDIUM confidence)
- `.planning/research/ARCHITECTURE.md` -- 프로젝트 아키텍처, 컴포넌트 경계
- `.planning/research/PITFALLS.md` -- WebSocket 연결 끊김, IP geolocation 정확도 한계
- `.planning/research/STACK.md` -- 기술 스택 결정 배경

### Tertiary (LOW confidence)
- geoip-lite MaxMind DB 정확도 -- 실제 한국 IP 테스트 필요 (문서상 도시 수준 40-75%)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- ws, geoip-lite, haversine 모두 성숙한 라이브러리, npm registry 확인 완료
- Architecture: HIGH -- shared 프로토콜 패턴은 Phase 1에서 검증됨, 서버 구조는 표준 패턴
- Pitfalls: HIGH -- 이전 리서치(PITFALLS.md)에서 상세 분석 완료, ws 공식 docs에서 heartbeat 패턴 검증

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (안정적인 라이브러리, 30일 유효)
