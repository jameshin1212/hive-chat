# Phase 14: Server Optimization - Research

**Researched:** 2026-03-21
**Domain:** Geospatial indexing, server-side broadcast optimization, reverse index patterns
**Confidence:** HIGH

## Summary

Phase 14는 서버의 O(N) 전체 순회를 geohash 기반 공간 인덱스와 역 인덱스로 대체하여 10K-1M 사용자 규모에서 효율적으로 동작하게 하는 최적화다. 변경 대상은 `GeoLocationService.findNearbyUsers()`, `SignalingServer.broadcastToRegistered()`, `SignalingServer.notifyFriendSubscribers()` 세 함수이며, `PresenceManager`에 geohash 인덱스와 friend 역 인덱스를 추가한다.

Geohash 라이브러리는 `geohashing` (v2.0.1)을 사용한다. ESM + TypeScript 네이티브 지원, zero dependencies, pure JS로 프로젝트의 ESM-only + native dependency 금지 제약을 모두 충족한다. 5자리 geohash(~5km 셀) + 이웃 8셀 조회로 10km broadcast 반경을 커버하는 전략은 CONTEXT.md에서 확정되었다.

**Primary recommendation:** `geohashing` 라이브러리로 5자리 geohash 인덱스를 `PresenceManager`에 추가하고, broadcast/friend-notify를 인덱스 기반으로 교체한다. 기존 `getDistanceKm()`은 geohash 조회 후 정밀 필터링에 유지한다.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- USER_JOINED/USER_LEFT/USER_STATUS broadcast를 **DEFAULT_RADIUS_KM (10km)** 기준으로 제한
- 사용자가 UPDATE_RADIUS로 반경 변경해도 broadcast는 **10km 고정** (서버 로직 단순화)
- 클라이언트가 자체적으로 설정 반경 기준 필터링 (기존 동작 유지)
- 10km 밖 사용자는 broadcast 미수신 -- 의도된 동작 변경, 괜찮음
- **5자리 geohash** (~5km 셀 크기) 사용
- **이웃 셀 포함**: 중심 셀 + 주변 8개 셀 조회로 경계선 문제 해결
- 5km 셀 x 9개 = 약 15km 범위 커버 -> 10km 반경 충분히 포함
- `friendSubscriptions` Map 외에 역 인덱스 추가: `userId -> Set<subscriberId>`
- 친구 온/오프라인 알림 시 역 인덱스로 O(1) 조회 (거리 무관, 기존 동작 유지)

### Claude's Discretion
- Geohash 라이브러리 선택 (ngeohash 등 pure JS)
- 테스트 범위 및 수준 (기존 테스트 수정 + 새 테스트 추가)
- GeoLocationService 리팩토링 범위
- PresenceManager 내부 데이터 구조 설계
- 성능 벤치마크 필요 여부

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SOPT-01 | broadcastToRegistered가 전체 클라이언트가 아닌 반경 내 사용자에게만 USER_JOINED/USER_LEFT를 전송한다 | geohash 인덱스 기반 `getUsersInRadius()` 메서드로 대상 필터링 |
| SOPT-02 | getNearbyUsers가 공간 인덱스(geohash)를 사용하여 O(N) 전체 순회 없이 근처 사용자를 조회한다 | `geohashing` 라이브러리의 `encodeBase32` + `getNeighborsBase32`로 셀 기반 조회 |
| SOPT-03 | notifyFriendSubscribers가 역 인덱스를 사용하여 O(N*F) 전체 순회 없이 구독자를 즉시 조회한다 | `friendReverseIndex: Map<userId, Set<subscriberId>>` 역 인덱스 |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| geohashing | 2.0.1 | Geohash encode/decode/neighbors | TypeScript 네이티브, ESM 지원, zero deps, pure JS |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| geohashing | ngeohash 0.6.3 | ngeohash는 CJS-only (ESM export 없음), @types/ngeohash 별도 설치 필요. 이 프로젝트는 ESM-only이므로 부적합 |
| geohashing | 직접 구현 | Geohash 알고리즘은 ~100줄이지만 neighbors 로직 포함 시 edge case 多. 검증된 라이브러리 사용이 안전 |

**Installation:**
```bash
cd packages/server && npm install geohashing
```

**Version verification:** `npm view geohashing version` -> 2.0.1 (2026-03-21 확인)

## Architecture Patterns

### 데이터 구조 변경

```
PresenceManager (기존)
├── users: Map<userId, UserRecord>          # 유지

PresenceManager (추가)
├── geohashIndex: Map<geohash5, Set<userId>>   # 공간 인덱스
├── userGeohash: Map<userId, geohash5>          # 역매핑 (삭제용)
└── friendReverseIndex: Map<userId, Set<subscriberId>>  # 친구 역 인덱스
```

### Pattern 1: Geohash Spatial Index

**What:** 사용자 등록 시 위치를 5자리 geohash로 인코딩하여 셀별 인덱스에 저장. 조회 시 중심 셀 + 8 이웃 셀의 사용자만 순회.

**When to use:** `getNearbyUsers()`, `broadcastToRegistered()` (지역 기반 broadcast)

**Example:**
```typescript
// Source: geohashing README (https://github.com/arseny034/geohashing)
import { encodeBase32, getNeighborsBase32 } from 'geohashing';

// 등록 시: geohash 계산 + 인덱스 추가
const hash = encodeBase32(user.lat, user.lon, 5); // 5자리 = ~5km 셀
// geohashIndex.get(hash)?.add(userId)

// 조회 시: 중심 + 8 이웃 = 9셀
const neighbors = getNeighborsBase32(hash);
const cells = [hash, neighbors.north, neighbors.northEast, neighbors.east,
  neighbors.southEast, neighbors.south, neighbors.southWest,
  neighbors.west, neighbors.northWest];

// 9셀의 사용자만 순회 + haversine 정밀 필터링
for (const cell of cells) {
  const usersInCell = geohashIndex.get(cell) ?? new Set();
  for (const uid of usersInCell) {
    // getDistanceKm()로 정확한 거리 확인
  }
}
```

### Pattern 2: Friend Reverse Index

**What:** 기존 `friendSubscriptions` (subscriberId -> friends[])에 추가로 역 인덱스 (targetUserId -> Set<subscriberId>) 유지. 친구 상태 변경 시 O(1) 조회.

**When to use:** `notifyFriendSubscribers()`, `handleFriendStatusRequest()`

**Example:**
```typescript
// 기존: O(N*F) - 모든 구독자 순회하며 매칭
for (const [subscriberId, friends] of this.friendSubscriptions) {
  const match = friends.some(f => f.nickname === nickname && f.tag === tag);
  // ...
}

// 개선: O(1) 조회
// friendReverseIndex: Map<targetUserId, Set<subscriberId>>
const subscribers = this.friendReverseIndex.get(userId) ?? new Set();
for (const subscriberId of subscribers) {
  this.sendToUser(subscriberId, { type: MessageType.FRIEND_STATUS_UPDATE, ... });
}
```

### Pattern 3: Broadcast Scope Change

**What:** `broadcastToRegistered()`를 발신자의 geohash 기반으로 10km 반경 내 사용자에게만 전송하도록 변경.

**현재 코드 (`SignalingServer.ts:491-500`):**
```typescript
// 전체 wss.clients 순회 - O(N)
for (const client of this.wss.clients) {
  const ws = client as AliveWebSocket;
  if (ws.readyState === WebSocket.OPEN && ws.userId && ws.userId !== excludeUserId) {
    this.send(ws, message);
  }
}
```

**개선 방향:**
```typescript
// 발신자 위치 기반 geohash 9셀 조회 -> haversine 필터 -> 해당 사용자에게만 전송
private broadcastToNearby(
  message: ServerMessage,
  originLat: number,
  originLon: number,
  radiusKm: number,
  excludeUserId?: string,
): void {
  const nearbyUserIds = this.presenceManager.getUsersInRadius(
    originLat, originLon, radiusKm, excludeUserId
  );
  for (const userId of nearbyUserIds) {
    this.sendToUser(userId, message);
  }
}
```

### Anti-Patterns to Avoid
- **Geohash만으로 거리 판단:** Geohash는 근사값. 셀 경계에서 오차 발생 가능. 반드시 haversine으로 최종 필터링.
- **인덱스 불일치:** register/unregister 시 geohashIndex와 userGeohash 동기화 누락하면 메모리 누수 또는 phantom 사용자 발생.
- **broadcastToRegistered 시그니처 변경 최소화:** 호출부 3곳(L193, L376, L474) 모두 수정 필요. origin 위치 정보를 파라미터로 전달해야 함.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Geohash 인코딩/디코딩 | 자체 비트 연산 구현 | `geohashing` 라이브러리 | 이웃 셀 계산, 경계 처리 등 edge case 다수 |
| Haversine 거리 계산 | 자체 수학 함수 | 기존 `haversine` 패키지 (이미 설치됨) | 지구 곡률 보정, 단위 변환 |
| 공간 인덱스 (R-tree 등) | 복잡한 트리 구조 | Geohash + Map 조합 | 이 규모(10K-1M)에서 geohash 셀 기반이 충분. R-tree는 과도 |

**Key insight:** 5자리 geohash + 9셀 조회는 구현이 단순하면서도 O(N) -> O(셀당 사용자 수)로 효과적. 전 세계 균등 분포 시 셀당 사용자 수는 전체의 극히 일부.

## Common Pitfalls

### Pitfall 1: Geohash Index Stale Entry
**What goes wrong:** unregister 시 geohashIndex에서 userId를 제거하지 않으면 존재하지 않는 사용자에게 메시지 전송 시도.
**Why it happens:** userGeohash 역매핑 없이 geohashIndex에서 제거할 셀을 모름.
**How to avoid:** `userGeohash: Map<userId, geohash>` 유지. unregister 시 이 맵에서 해당 geohash를 찾아 geohashIndex에서 제거.
**Warning signs:** "사용자가 떠났는데 broadcast 대상에 포함" 로그.

### Pitfall 2: Friend Reverse Index Desync
**What goes wrong:** friendSubscriptions 변경 시 friendReverseIndex 동기화를 잊으면 알림 누락 또는 잘못된 알림.
**Why it happens:** 두 Map을 수동으로 동기화해야 함. handleFriendStatusRequest + handleDisconnect 양쪽에서 관리.
**How to avoid:** 역 인덱스 업데이트를 friendSubscriptions 변경과 같은 메서드에서 원자적으로 처리.
**Warning signs:** 친구가 온라인인데 알림 안 옴, 또는 친구 아닌 사용자의 알림 수신.

### Pitfall 3: DEFAULT_RADIUS_KM Confusion
**What goes wrong:** `shared/constants.ts`의 `DEFAULT_RADIUS_KM`은 현재 3이지만, broadcast 반경은 10km 고정으로 결정됨.
**Why it happens:** 클라이언트의 기본 검색 반경(3km)과 서버의 broadcast 반경(10km)이 다른 값.
**How to avoid:** 서버에 `BROADCAST_RADIUS_KM = 10` 상수를 별도 정의. `DEFAULT_RADIUS_KM`은 클라이언트 검색용으로 유지.
**Warning signs:** broadcast가 3km 반경으로만 전송되어 사용자 발견 누락.

### Pitfall 4: Empty Geohash Cell Accumulation
**What goes wrong:** 사용자가 모두 떠난 셀의 빈 Set이 geohashIndex에 남아 메모리 누수.
**Why it happens:** Set에서 userId 제거 후 Set.size === 0 체크를 안 함.
**How to avoid:** unregister 시 Set이 비면 해당 geohash 키 자체를 Map에서 delete.

### Pitfall 5: broadcastToRegistered 호출부 누락
**What goes wrong:** 3곳의 broadcastToRegistered 호출(L193 USER_JOINED, L376 USER_LEFT, L474 USER_STATUS) 중 일부만 수정하면 불일치.
**Why it happens:** 한 곳은 `handleRegister`, 한 곳은 `handleDisconnect`, 한 곳은 `startHeartbeatCheck` 내부.
**How to avoid:** 모든 호출부를 새 `broadcastToNearby`로 교체. stale user의 L474는 user.lat/lon으로 origin 전달.

## Code Examples

### Geohash 인코딩 + 이웃 셀 조회
```typescript
// Source: geohashing v2.0.1 (https://github.com/arseny034/geohashing)
import { encodeBase32, getNeighborsBase32 } from 'geohashing';

const GEOHASH_PRECISION = 5; // ~5km cells

function getGeohashCells(lat: number, lon: number): string[] {
  const center = encodeBase32(lat, lon, GEOHASH_PRECISION);
  const neighbors = getNeighborsBase32(center);
  return [
    center,
    neighbors.north, neighbors.northEast, neighbors.east,
    neighbors.southEast, neighbors.south, neighbors.southWest,
    neighbors.west, neighbors.northWest,
  ];
}
```

### PresenceManager Geohash Index 확장
```typescript
// geohash 인덱스 추가 (PresenceManager 내부)
private geohashIndex = new Map<string, Set<string>>();  // geohash -> Set<userId>
private userGeohash = new Map<string, string>();          // userId -> geohash

register(id: string, record: UserRecord): void {
  // 기존 사용자 제거
  const existing = this.users.get(id);
  if (existing) {
    existing.ws.terminate();
    this.removeFromGeohashIndex(id);
  }

  this.users.set(id, record);

  // geohash 인덱스에 추가
  const hash = encodeBase32(record.lat, record.lon, GEOHASH_PRECISION);
  this.userGeohash.set(id, hash);
  if (!this.geohashIndex.has(hash)) {
    this.geohashIndex.set(hash, new Set());
  }
  this.geohashIndex.get(hash)!.add(id);
}

private removeFromGeohashIndex(id: string): void {
  const hash = this.userGeohash.get(id);
  if (hash) {
    const set = this.geohashIndex.get(hash);
    if (set) {
      set.delete(id);
      if (set.size === 0) this.geohashIndex.delete(hash);
    }
    this.userGeohash.delete(id);
  }
}
```

### Friend Reverse Index
```typescript
// SignalingServer 내부
private friendReverseIndex = new Map<string, Set<string>>(); // targetUserId -> Set<subscriberId>

// handleFriendStatusRequest에서 업데이트
private updateFriendReverseIndex(subscriberId: string, friends: Array<{nickname: string; tag: string}>): void {
  // 기존 역 인덱스에서 이 구독자 제거
  this.cleanReverseIndexForSubscriber(subscriberId);

  // 새 친구 목록으로 역 인덱스 재구축
  for (const friend of friends) {
    const targetId = `${friend.nickname}#${friend.tag}`;
    if (!this.friendReverseIndex.has(targetId)) {
      this.friendReverseIndex.set(targetId, new Set());
    }
    this.friendReverseIndex.get(targetId)!.add(subscriberId);
  }
}

private cleanReverseIndexForSubscriber(subscriberId: string): void {
  for (const [targetId, subscribers] of this.friendReverseIndex) {
    subscribers.delete(subscriberId);
    if (subscribers.size === 0) this.friendReverseIndex.delete(targetId);
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 전체 Map 순회 (O(N)) | Geohash 셀 기반 조회 | 이 Phase | broadcast 대상을 O(셀 사용자 수)로 축소 |
| 전체 subscription 순회 (O(N*F)) | 역 인덱스 O(1) 조회 | 이 Phase | 친구 알림 즉시 조회 |
| broadcastToRegistered 전체 전송 | 지역 기반 선별 전송 | 이 Phase | 10km 밖 사용자 불필요한 메시지 제거 |

## Open Questions

1. **BROADCAST_RADIUS_KM 상수 위치**
   - What we know: broadcast는 10km 고정, 클라이언트 DEFAULT_RADIUS_KM은 3km
   - What's unclear: 새 상수를 shared에 둘지 server에만 둘지
   - Recommendation: server 전용 상수로 정의 (클라이언트가 알 필요 없음). `packages/server/src/constants.ts` 또는 기존 파일 내 상수.

2. **cleanReverseIndexForSubscriber 성능**
   - What we know: 구독자 disconnect 시 역 인덱스 전체 순회 필요 (현재 설계)
   - What's unclear: 대규모에서 이 순회가 병목이 될 수 있음
   - Recommendation: subscriberId -> Set<targetUserId> 정방향 매핑도 유지하면 O(친구 수)로 cleanup 가능. 구현 시 판단.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 3.2.4 |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npx vitest run packages/server/src/__tests__/ --reporter=verbose` |
| Full suite command | `npx vitest run --reporter=verbose` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SOPT-01 | broadcastToNearby가 반경 내 사용자에게만 USER_JOINED/USER_LEFT 전송 | integration | `npx vitest run packages/server/src/__tests__/SignalingServer.test.ts -x` | 기존 파일 수정 |
| SOPT-02 | getNearbyUsers가 geohash 인덱스로 조회 | unit | `npx vitest run packages/server/src/__tests__/GeoLocationService.test.ts -x` | Wave 0 생성 |
| SOPT-03 | notifyFriendSubscribers가 역 인덱스로 O(1) 조회 | integration | `npx vitest run packages/server/src/__tests__/FriendStatus.test.ts -x` | 기존 파일 수정 |

### Sampling Rate
- **Per task commit:** `npx vitest run packages/server/src/__tests__/ --reporter=verbose`
- **Per wave merge:** `npx vitest run --reporter=verbose`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `packages/server/src/__tests__/GeoLocationService.test.ts` -- geohash 인덱스 단위 테스트 (SOPT-02)
- [ ] 기존 `SignalingServer.test.ts` 수정 -- broadcast 범위 테스트 추가 (SOPT-01)
- [ ] 기존 `FriendStatus.test.ts` 수정 -- 역 인덱스 기반 알림 테스트 (SOPT-03)

## Sources

### Primary (HIGH confidence)
- `geohashing` npm package -- ESM export 확인 (`npm view geohashing exports`), v2.0.1
- [geohashing GitHub](https://github.com/arseny034/geohashing) -- API 문서, TypeScript 네이티브 확인
- [ngeohash GitHub](https://github.com/sunng87/node-geohash) -- CJS-only 확인, ESM 미지원
- 프로젝트 소스 코드 직접 분석 -- SignalingServer.ts, PresenceManager.ts, GeoLocationService.ts

### Secondary (MEDIUM confidence)
- Geohash precision table (5자리 = ~4.9km x 4.9km) -- 공개 표준 스펙

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - npm registry에서 직접 확인, ESM/TypeScript/zero deps 검증 완료
- Architecture: HIGH - 기존 코드 구조 직접 분석, 변경 지점 명확
- Pitfalls: HIGH - 코드 분석 기반, 인덱스 동기화 패턴은 잘 알려진 문제

**Research date:** 2026-03-21
**Valid until:** 2026-04-21 (안정적 도메인, 라이브러리 변경 가능성 낮음)
