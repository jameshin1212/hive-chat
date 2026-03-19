# Phase 5: P2P Upgrade - Research

**Researched:** 2026-03-19
**Domain:** Hyperswarm P2P integration with existing relay chat + ConnectionManager transport abstraction
**Confidence:** HIGH

## Summary

Phase 5는 기존 relay 전용 채팅을 Hyperswarm 기반 P2P 직접 연결로 업그레이드한다. 핵심은 ConnectionManager 클래스를 새로 만들어 SignalingClient(relay)와 Hyperswarm(P2P) 두 transport를 추상화하고, 채팅 시작 시 relay로 즉시 연결한 후 백그라운드에서 P2P 업그레이드를 시도하는 것이다.

Hyperswarm v4.17.0은 sodium-native(prebuilt binaries 포함)에 의존하는 native 모듈을 포함한다. 프로젝트 규칙에 "native dependency 금지"가 있으나, CLAUDE.md 기술 스택에 Hyperswarm이 명시되어 있다. sodium-native는 prebuildify로 13개 플랫폼 바이너리를 내장하여 node-gyp 컴파일 없이 설치되지만, tsdown 단일 파일 번들에는 포함할 수 없다. 따라서 client 패키지는 hyperswarm을 dependencies로 선언하고 번들링에서 제외(external)해야 한다.

**Primary recommendation:** ConnectionManager를 EventEmitter 기반으로 구현하여 기존 useChatSession hook 수정 없이 transport 전환을 투명하게 처리. 서버에 P2P_SIGNAL 메시지 타입을 추가하여 Hyperswarm topic 교환을 중개.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- 채팅 시작 시 relay로 즉시 연결 (대기 없음)
- 백그라운드에서 P2P 연결 시도, 성공 시 자동 전환
- P2P 연결 중 상태: StatusBar만 변경 (메시지 영역에 시스템 메시지 없음)
- P2P 실패 시: StatusBar가 relay 상태 유지 (별도 알림 없음)
- 근처 사용자와 친구 모두 동일 전략 (P2P 시도 -> relay fallback)
- relay 채팅 중 백그라운드 P2P 업그레이드 시도 (성공 시 자동 전환)
- P2P -> relay 다운그레이드: 자동 전환, StatusBar만 변경 (시스템 메시지 없음)
- 전환 중 메시지 유실 허용 (현재 relay 방식과 동일 정책)
- 양쪽 사용자의 연결 방식은 항상 동일 (양쪽 모두 P2P 또는 양쪽 모두 relay)
- 신호 서버가 양쪽에 상대방의 Hyperswarm topic/key 전달 (서버 중개 방식)
- P2P handshake 시 nick#tag 교환으로 상대방 확인 (암호학적 검증 없음)
- 양쪽 모두 서버 접속 상태에서만 채팅 가능 (P2P 성공 시에도 서버 연결 유지)
- Hyperswarm 연결 시도 타임아웃: 3초 (실패 시 relay 유지)
- Connection Status 색상: direct(P2P)=초록 connected, relay=노랑 connected, disconnected=빨강 offline
- 텍스트는 기존 'connected' 유지, 색상만 변경
- 전환 시 즉시 변경 (애니메이션/깜빡임 없음)

### Claude's Discretion
- ConnectionManager 내부 설계 (transport 추상화 구조)
- Hyperswarm topic 생성 방식 (session ID 기반 등)
- P2P binary 프로토콜 설계 (JSON vs binary 선택)
- 서버 측 P2P 중개 메시지 타입 설계
- P2P 연결 상태 모니터링 방식
- 백그라운드 P2P 업그레이드 시도 타이밍

### Deferred Ideas (OUT OF SCOPE)
- 서버 배포 (Fly.io) -- 모든 Phase 완료 후 별도 작업
- E2E 암호화 -- v1 out of scope (P2P 직접 연결이 transport security 제공)
- P2P 전용 모드 (서버 없이 채팅) -- 서버 접속 필수로 결정
- 그룹 채팅 P2P -- v2 scope
- TUI 개선 3건 (커서 이동, 커맨드 자동완성, 상태바 위치) -- 별도 phase
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TUI-03 | 연결 상태 표시 (direct/relay/disconnected) | StatusBar에 transportType prop 추가, connectionColor 함수에 transport 조건 분기. 색상: direct=green, relay=yellow, disconnected=red |
| SOCL-03 | 원격 친구와 P2P 연결 (NAT traversal + relay fallback) | ConnectionManager가 Hyperswarm으로 P2P 시도, 3초 타임아웃 후 relay fallback. 서버가 topic 중개 |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| hyperswarm | ^4.17.0 | P2P 연결 (NAT traversal + Noise 암호화) | CLAUDE.md 지정 스택. UDP hole-punching, DHT 기반 peer discovery, E2E Noise encryption 내장 |
| b4a | ^1.8.0 | Buffer/Uint8Array 유틸리티 | Hyperswarm 생태계 표준. topic buffer 생성에 필수 |
| hypercore-crypto | latest | 해시 함수 (topic 생성) | Hyperswarm topic 32-byte buffer 생성용. sodium 기반 crypto_generichash |

**Version verified:** npm registry 확인 (2026-03-19)
- hyperswarm: 4.17.0
- b4a: 1.8.0

### Native Dependency 주의사항

hyperswarm -> hyperdht -> sodium-universal -> sodium-native (native C addon)

**사실:** sodium-native v5.1.0은 prebuildify로 13개 플랫폼 바이너리를 내장 출시. node-gyp 컴파일 불필요.
- darwin-arm64, darwin-x64, linux-arm64, linux-x64, win32-x64 등 모든 주요 플랫폼 커버
- npm install 시 prebuild 자동 선택, 컴파일 스텝 없음
- 총 node_modules 크기: ~26MB (sodium-native prebuilds가 ~17MB)

**영향:** tsdown 단일 파일 번들에 native 모듈 포함 불가. client의 tsdown 빌드에서 hyperswarm을 external로 처리해야 함. `npm pack` 결과물에 node_modules는 포함되지 않으므로 tarball 크기 영향 없음. 하지만 사용자의 `npx` 설치 시 ~26MB 추가 다운로드 발생.

**Confidence:** HIGH -- npm registry에서 직접 설치 테스트 완료

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| hyperswarm | relay만 유지 | P2P 없이 서버 부하 증가. 프로젝트 핵심 가치 미달성 |
| hyperswarm | libp2p | 설정 복잡도 10배. CLI 도구에 과도함 |
| b4a | Buffer 직접 사용 | b4a가 Bare + Node.js 양쪽 호환. Hyperswarm 생태계 표준 |

**Installation:**
```bash
# client 패키지에 추가
npm install hyperswarm b4a hypercore-crypto
```

## Architecture Patterns

### Recommended Project Structure (변경분)
```
packages/
  client/src/
    network/
      SignalingClient.ts     # 기존 유지 (relay transport)
      ConnectionManager.ts   # 신규 — transport 추상화 (relay + P2P)
      HyperswarmTransport.ts # 신규 — Hyperswarm 연결 관리
  server/src/
    SignalingServer.ts       # P2P 중개 메시지 핸들러 추가
    ChatSessionManager.ts   # transportType 필드 추가
  shared/src/
    protocol.ts             # P2P 중개 메시지 스키마 추가
```

### Pattern 1: ConnectionManager Transport Abstraction

**What:** ConnectionManager가 SignalingClient(relay)와 HyperswarmTransport(P2P)를 래핑하여 통합 인터페이스 제공
**When to use:** 모든 채팅 세션에서 transport-agnostic 메시지 송수신
**Recommendation:**

```typescript
// ConnectionManager는 EventEmitter를 확장
// 기존 useChatSession hook이 의존하는 이벤트 시그니처를 그대로 유지
// transport 전환은 내부에서 처리, 외부에 transportType 변경 이벤트만 emit

class ConnectionManager extends EventEmitter {
  private signalingClient: SignalingClient;
  private hyperswarmTransport: HyperswarmTransport | null = null;
  private activeTransport: 'relay' | 'direct' = 'relay';

  // useChatSession이 기존에 사용하던 메서드를 동일하게 제공
  sendChatMessage(sessionId: string, content: string): void {
    if (this.activeTransport === 'direct' && this.hyperswarmTransport) {
      this.hyperswarmTransport.send(content);
    } else {
      this.signalingClient.sendChatMessage(sessionId, content);
    }
  }

  // transport 변경 시 이벤트 emit
  private switchTransport(to: 'relay' | 'direct'): void {
    this.activeTransport = to;
    this.emit('transport_changed', to);
  }
}
```

**Confidence:** HIGH -- 기존 코드의 EventEmitter 패턴과 일치. useChatSession이 SignalingClient 이벤트만 구독하는 구조이므로, ConnectionManager가 같은 이벤트를 emit하면 hook 수정 최소화.

### Pattern 2: Hyperswarm Topic Generation (session ID 기반)

**What:** 채팅 세션 수립 시 양쪽 peer가 동일한 topic으로 Hyperswarm에 join하여 P2P 연결
**Recommendation:**

```typescript
import crypto from 'hypercore-crypto';
import b4a from 'b4a';

// sessionId를 topic으로 변환 (32-byte hash)
function sessionToTopic(sessionId: string): Buffer {
  return crypto.data(b4a.from(sessionId));
}

// 양쪽이 같은 sessionId로 topic을 생성하면 동일한 32-byte buffer
// 서버가 P2P_SIGNAL 메시지로 sessionId를 양쪽에 전달
```

**Confidence:** HIGH -- Hyperswarm의 topic은 32-byte Buffer이며, sessionId(UUID)를 해시하면 결정론적으로 동일한 topic 생성.

### Pattern 3: Background P2P Upgrade Flow

**What:** relay 채팅 활성화 후 백그라운드에서 P2P 시도, 성공 시 자동 전환
**Flow:**

```
1. CHAT_ACCEPTED 수신 → relay로 즉시 채팅 시작
2. 서버가 양쪽에 P2P_SIGNAL 메시지 전송 (topic 포함)
3. 양쪽 클라이언트가 Hyperswarm.join(topic) 실행
4. swarm.on('connection') → P2P handshake (nick#tag 교환)
5. handshake 성공 → transport 전환 (relay → direct)
6. 3초 타임아웃 → P2P 시도 취소, relay 유지

전환 시:
- 메시지 송신: ConnectionManager가 activeTransport 기준으로 라우팅
- 메시지 수신: P2P connection의 data 이벤트를 기존 chat_msg 이벤트로 변환
- StatusBar: transport_changed 이벤트로 색상 즉시 변경
```

### Pattern 4: P2P Handshake Protocol (JSON over Duplex Stream)

**Recommendation:** P2P 연결에서도 JSON 프로토콜 사용 (binary는 v2에서 고려)
- Hyperswarm connection은 Duplex stream이므로 newline-delimited JSON 사용
- 첫 메시지로 handshake 교환: `{ type: 'handshake', nickname, tag, sessionId }`
- 이후 채팅 메시지: `{ type: 'message', content, timestamp }`
- 간단한 line-based parser로 충분 (protomux는 이 단계에서 불필요)

**Why JSON over binary:** v1의 1:1 채팅 메시지는 소량의 텍스트. binary 프로토콜의 성능 이점이 무의미. JSON은 디버깅 용이하고 기존 zod schema 재활용 가능.

**Confidence:** MEDIUM -- protomux 대신 간단한 JSON이 v1에 적합하다는 판단. 그룹 채팅(v2)에서 protomux 도입 고려.

### Anti-Patterns to Avoid
- **P2P 연결 대기로 채팅 시작 지연:** relay 즉시 연결 후 백그라운드 P2P. 절대 P2P 성공을 기다리지 않음
- **서버 연결 끊기:** P2P 성공 후에도 서버 WebSocket 유지. 친구 상태, nearby users 등 서버 기능 필요
- **useChatSession hook 대규모 수정:** ConnectionManager가 같은 이벤트 시그니처를 제공하여 hook 변경 최소화
- **양쪽 비대칭 transport:** 한쪽은 P2P, 다른 쪽은 relay가 되는 상황 방지. P2P handshake 완료 후에만 전환

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| NAT traversal | UDP hole punching 직접 구현 | Hyperswarm (hyperdht 내장) | NAT 유형 감지, STUN, relay 모두 내장. 성공률 70-85% |
| P2P stream encryption | 커스텀 암호화 프로토콜 | Hyperswarm Noise protocol | 연결 수립 시 자동 E2E 암호화. 추가 코드 불필요 |
| Topic-based peer discovery | DHT 직접 구현 | Hyperswarm DHT | topic join/leave로 peer 발견 자동화 |
| Buffer 조작 | Buffer.from/alloc 직접 사용 | b4a | Bare + Node.js 양쪽 호환. Hyperswarm 생태계 표준 유틸 |

**Key insight:** Hyperswarm이 NAT traversal, encryption, peer discovery를 모두 내장하므로, ConnectionManager는 "언제 P2P를 시도하고 언제 relay로 fallback하는가"의 로직에만 집중하면 된다.

## Common Pitfalls

### Pitfall 1: Hyperswarm Connection Event 중복 발생
**What goes wrong:** swarm.on('connection')이 같은 peer에 대해 여러 번 발생할 수 있음 (server/client 양쪽 모드)
**Why it happens:** 양쪽이 모두 server+client 모드로 join하면 양방향 연결 시도로 2개 connection이 생길 수 있음
**How to avoid:** peer의 publicKey로 dedup 처리. 또는 한쪽은 server only, 다른 쪽은 client only로 역할 분리 (채팅 요청자가 client, 수락자가 server)
**Warning signs:** 같은 메시지가 2번 수신되거나, 연결 후 즉시 에러 발생

### Pitfall 2: P2P 전환 중 메시지 유실
**What goes wrong:** relay에서 P2P로 전환하는 순간 양쪽의 activeTransport가 다를 수 있음
**Why it happens:** A가 direct로 전환했지만 B는 아직 relay인 상태. A가 P2P로 보낸 메시지를 B가 못 받음
**How to avoid:** P2P handshake에 "전환 확인" 단계 추가. 양쪽 모두 handshake 완료 후에만 transport 전환. 사용자 결정에 따라 메시지 유실 허용이므로, 복잡한 동기화 불필요하지만 양쪽 동시 전환은 보장해야 함
**Warning signs:** 전환 직후 1-2개 메시지가 사라짐

### Pitfall 3: Hyperswarm 정리 안 됨 (메모리 누수)
**What goes wrong:** 채팅 종료 시 swarm.leave(topic) + connection.destroy()를 하지 않으면 DHT에 계속 announce
**Why it happens:** swarm.leave()만으로는 기존 connection이 닫히지 않음. connection도 별도로 destroy 해야 함
**How to avoid:** 채팅 종료 시: 1) connection.destroy() 2) swarm.leave(topic) 3) 필요 시 swarm.destroy() (앱 종료 시)
**Warning signs:** 프로세스 종료가 지연되거나 hang. 메모리 사용량 지속 증가

### Pitfall 4: 3초 타임아웃이 너무 짧음/길음
**What goes wrong:** NAT traversal은 네트워크에 따라 1-10초 소요. 3초에 실패하는 연결이 5초면 성공할 수 있음
**Why it happens:** UDP hole punching 속도는 NAT 유형, 네트워크 상태, DHT 응답 속도에 의존
**How to avoid:** 사용자 결정에 따라 3초 고정. 이 값은 constants에 정의하여 추후 조정 가능하게. 대부분의 성공 가능한 연결은 1-2초 내에 수립됨
**Warning signs:** P2P 성공률이 예상보다 낮음 (타임아웃 늘리면 개선되는지 확인)

### Pitfall 5: tsdown 번들에 Hyperswarm 포함 시도
**What goes wrong:** sodium-native는 native addon이므로 tsdown/esbuild가 번들링할 수 없음
**Why it happens:** 기존 client 빌드가 단일 파일 번들 전략
**How to avoid:** tsdown 설정에서 hyperswarm, b4a, hypercore-crypto를 external로 지정. package.json의 dependencies에 명시하여 npm install 시 자동 설치되게 함

## Code Examples

### Hyperswarm 기본 연결 패턴
```typescript
// Source: hyperswarm npm README + holepunchto/hyperswarm GitHub
import Hyperswarm from 'hyperswarm';
import b4a from 'b4a';
import crypto from 'hypercore-crypto';

const swarm = new Hyperswarm();

// topic 생성 (sessionId 기반)
const topic = crypto.data(b4a.from(sessionId));

// connection 이벤트 (Noise-encrypted Duplex stream)
swarm.on('connection', (conn, peerInfo) => {
  // conn은 Node.js Duplex stream
  conn.on('data', (data: Buffer) => {
    const msg = JSON.parse(data.toString());
    // handle message
  });

  conn.write(JSON.stringify({ type: 'handshake', nickname, tag, sessionId }));

  conn.on('close', () => {
    // P2P 연결 끊김 → relay로 다운그레이드
  });

  conn.on('error', (err) => {
    // 에러 처리
  });
});

// topic join (server + client 모드)
const discovery = swarm.join(topic, { server: true, client: true });

// 정리
await swarm.leave(topic);
conn.destroy();
await swarm.destroy(); // 앱 종료 시
```

### P2P 중개 프로토콜 메시지 (shared/protocol.ts 추가분)
```typescript
// 서버 → 클라이언트: P2P 연결 시도 시그널
export const p2pSignalSchema = z.object({
  type: z.literal(MessageType.P2P_SIGNAL),
  sessionId: z.string().uuid(),
  topic: z.string(), // hex-encoded 32-byte topic
});

// 클라이언트 → 서버: P2P 연결 결과 보고 (선택적)
export const p2pStatusSchema = z.object({
  type: z.literal(MessageType.P2P_STATUS),
  sessionId: z.string().uuid(),
  transportType: z.enum(['relay', 'direct']),
});
```

### StatusBar transport 색상 분기
```typescript
// StatusBar.tsx 수정 패턴
type TransportType = 'relay' | 'direct';

function connectionColor(status: ConnectionStatus, transport?: TransportType): string {
  if (status === 'connected') {
    return transport === 'direct' ? 'green' : 'yellow';
  }
  if (status === 'connecting' || status === 'reconnecting') return 'yellow';
  return 'red'; // offline
}
```

### ConnectionManager → useChatSession 통합 패턴
```typescript
// useChatSession은 현재 SignalingClient 이벤트를 구독
// ConnectionManager가 같은 이벤트를 emit하므로 변경 최소화
//
// 변경 전: useChatSession(client: SignalingClient, ...)
// 변경 후: useChatSession(connectionManager: ConnectionManager, ...)
//
// ConnectionManager는 SignalingClient의 모든 이벤트를 proxy하고
// P2P에서 수신한 메시지도 같은 형식의 이벤트로 변환하여 emit
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| WebRTC DataChannel for Node.js P2P | Hyperswarm (UDP hole-punch + Noise) | 2022-2023 | node-webrtc native 바이너리 불안정 → Hyperswarm prebuilt 안정적 |
| 수동 STUN/TURN 설정 | Hyperswarm DHT 자동 relay | Hyperswarm v4+ | NAT traversal 설정 불필요, DHT가 자동 처리 |
| protomux (스트림 멀티플렉싱) | 1:1 채팅에는 불필요 | - | v2 그룹 채팅에서 도입 고려 |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest (latest) |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TUI-03 | StatusBar가 transport type에 따라 올바른 색상 표시 | unit | `npx vitest run packages/client/src/ui/components/StatusBar.test.ts -x` | Wave 0 |
| SOCL-03 | ConnectionManager가 P2P 시도 후 3초 내 fallback | unit | `npx vitest run packages/client/src/network/ConnectionManager.test.ts -x` | Wave 0 |
| SOCL-03 | HyperswarmTransport가 topic join/leave 정상 처리 | unit | `npx vitest run packages/client/src/network/HyperswarmTransport.test.ts -x` | Wave 0 |
| SOCL-03 | P2P 중개 프로토콜 메시지 스키마 검증 | unit | `npx vitest run packages/shared/src/__tests__/p2pProtocol.test.ts -x` | Wave 0 |
| SOCL-03 | 서버 P2P_SIGNAL 메시지 전달 핸들러 | unit | `npx vitest run packages/server/src/__tests__/P2PSignaling.test.ts -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before verify

### Wave 0 Gaps
- [ ] `packages/client/src/ui/components/StatusBar.test.ts` -- transport type별 색상 테스트
- [ ] `packages/client/src/network/ConnectionManager.test.ts` -- transport 추상화, 전환 로직
- [ ] `packages/client/src/network/HyperswarmTransport.test.ts` -- Hyperswarm mock 기반 테스트
- [ ] `packages/shared/src/__tests__/p2pProtocol.test.ts` -- P2P 중개 메시지 스키마
- [ ] `packages/server/src/__tests__/P2PSignaling.test.ts` -- 서버 P2P 시그널링 핸들러

## Open Questions

1. **Hyperswarm swarm instance lifecycle**
   - What we know: swarm.destroy()는 모든 connection을 종료. swarm.leave(topic)은 discovery만 중지
   - What's unclear: 앱 실행 중 단일 Hyperswarm 인스턴스를 유지할지, 채팅 세션마다 새 인스턴스를 생성할지
   - Recommendation: 단일 인스턴스 유지. topic join/leave로 세션 관리. 리소스 효율적

2. **P2P handshake race condition**
   - What we know: 양쪽이 동시에 connection 이벤트를 받고 handshake를 보냄
   - What's unclear: 양쪽 모두 server+client 모드일 때 2개 connection이 생길 수 있음
   - Recommendation: 채팅 요청자가 client only, 수락자가 server only로 역할 분리. 또는 publicKey 비교로 하나만 유지

3. **tsdown external 설정**
   - What we know: native module은 번들 불가
   - What's unclear: tsdown의 external 설정 문법
   - Recommendation: 구현 시 tsdown 문서 확인. `external: ['hyperswarm', 'b4a', 'hypercore-crypto']` 형태일 것

## Sources

### Primary (HIGH confidence)
- [holepunchto/hyperswarm GitHub README](https://github.com/holepunchto/hyperswarm) -- API: swarm.join(), connection event, leave/destroy
- npm registry 직접 조회 -- hyperswarm 4.17.0, b4a 1.8.0, sodium-native 5.1.0 확인
- 로컬 설치 테스트 -- node_modules 26MB, sodium-native prebuilds 17MB (13 platforms)

### Secondary (MEDIUM confidence)
- [hyperswarm-universal-chat](https://github.com/RangerMauve/hyperswarm-universal-chat) -- P2P 채팅 구현 패턴 참조
- [prebuildify](https://github.com/prebuild/prebuildify) -- sodium-native가 prebuild 방식으로 native binary 배포 확인

### Tertiary (LOW confidence)
- P2P handshake 중복 connection 문제 -- 커뮤니티 보고 기반, 직접 테스트 필요

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- CLAUDE.md 지정 스택, npm registry 확인, 설치 테스트 완료
- Architecture: HIGH -- 기존 코드 분석 완료, EventEmitter 패턴 일관성 확인
- Pitfalls: MEDIUM -- Hyperswarm 중복 connection 등은 커뮤니티 보고 기반, 직접 검증 필요

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (Hyperswarm 생태계는 안정적, 30일 유효)
