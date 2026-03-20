# Phase 14: Server Optimization - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

서버의 broadcast/presence/friend-notify를 지역 기반으로 최적화하여 10K-1M 사용자 규모에서도 효율적으로 동작하게 한다. 기존 기능(사용자 발견, 채팅 요청, 친구 알림)은 동일하게 유지하되, O(N) 전체 순회를 제거한다.

</domain>

<decisions>
## Implementation Decisions

### Broadcast 범위
- USER_JOINED/USER_LEFT/USER_STATUS broadcast를 **DEFAULT_RADIUS_KM (10km)** 기준으로 제한
- 사용자가 UPDATE_RADIUS로 반경 변경해도 broadcast는 **10km 고정** (서버 로직 단순화)
- 클라이언트가 자체적으로 설정 반경 기준 필터링 (기존 동작 유지)
- 10km 밖 사용자는 broadcast 미수신 — 의도된 동작 변경, 괜찮음

### Geohash 전략
- **5자리 geohash** (~5km 셀 크기) 사용
- **이웃 셀 포함**: 중심 셀 + 주변 8개 셀 조회로 경계선 문제 해결
- 5km 셀 × 9개 = 약 15km 범위 커버 → 10km 반경 충분히 포함

### Friend 역 인덱스
- `friendSubscriptions` Map 외에 역 인덱스 추가: `userId → Set<subscriberId>`
- 친구 온/오프라인 알림 시 역 인덱스로 O(1) 조회 (거리 무관, 기존 동작 유지)

### Claude's Discretion
- Geohash 라이브러리 선택 (ngeohash 등 pure JS)
- 테스트 범위 및 수준 (기존 테스트 수정 + 새 테스트 추가)
- GeoLocationService 리팩토링 범위
- PresenceManager 내부 데이터 구조 설계
- 성능 벤치마크 필요 여부

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Server code (변경 대상)
- `packages/server/src/SignalingServer.ts` -- broadcastToRegistered() L492-500, notifyFriendSubscribers() L441-453
- `packages/server/src/PresenceManager.ts` -- users Map, getNearbyUsers() 위임
- `packages/server/src/GeoLocationService.ts` -- findNearbyUsers() O(N) 순회 L83-105, getDistanceKm()

### Server tests (수정 대상)
- `packages/server/src/__tests__/SignalingServer.test.ts`
- `packages/server/src/__tests__/P2PSignaling.test.ts`
- `packages/server/src/__tests__/FriendStatus.test.ts`

### Shared protocol
- `packages/shared/src/constants.ts` -- DEFAULT_RADIUS_KM, HEARTBEAT_INTERVAL_MS

### Project rules
- `.claude/rules/p2p-networking.md` -- IP geolocation 서버사이드, 기본 radius 10km
- `.claude/rules/protocol-design.md` -- protocol-first, zod 스키마
- `.claude/rules/monorepo-conventions.md` -- ESM-only, native dependency 금지

### Prior phase context
- `.planning/phases/05-p2p-upgrade/05-CONTEXT.md` -- ConnectionManager 설계, P2P 아키텍처

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `GeoLocationService.getDistanceKm()` -- haversine 거리 계산, geohash 이후에도 최종 필터링에 사용
- `PresenceManager` -- Map 기반 사용자 관리, geohash 인덱스 추가 확장점
- `findNearbyUsers()` -- geohash 기반으로 리팩토링 대상

### Established Patterns
- `PresenceManager.register()` -- 사용자 등록 시 geohash 계산 + 인덱스 추가 지점
- `PresenceManager.unregister()` -- 사용자 해제 시 인덱스 제거 지점
- EventEmitter 기반 서버 구조 (변경 불필요)

### Integration Points
- `broadcastToRegistered()` -- geohash 기반 지역 사용자 조회로 교체
- `handleRegister()` -- 등록 시 geohash 계산 + 인덱스에 추가
- `notifyFriendSubscribers()` -- 역 인덱스 조회로 교체
- `handleFriendStatusRequest()` -- 역 인덱스 등록 지점

### Key Constraint
- native dependency 금지 (npx 호환성) -- geohash 라이브러리는 pure JS 필수

</code_context>

<specifics>
## Specific Ideas

- 10km 고정 broadcast + 클라이언트 자체 필터링 = 서버 로직 단순화
- 5자리 geohash + 이웃 8셀 = 약 15km 커버 → 10km 반경 여유있게 포함
- 친구 알림은 거리 무관 (역 인덱스) — broadcast 최적화와 독립적

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 14-server-optimization*
*Context gathered: 2026-03-21*
