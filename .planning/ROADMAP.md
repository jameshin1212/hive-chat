# Roadmap: HiveChat

## Milestones

- [x] **v1.0 HiveChat MVP** -- Phases 1-5 (shipped 2026-03-19)
- [x] **v1.0.1 Bug Fix & UX Polish** -- Phases 6-8 (shipped 2026-03-19)
- [x] **v1.1 Settings & Cleanup** -- Phases 9-10 (shipped 2026-03-20)
- [x] **v1.2 Deploy & Publish** -- Phases 11-13 (shipped 2026-03-20)
- [ ] **v1.3 Infrastructure Optimization** -- Phases 14-15

## Phases

<details>
<summary>v1.0 HiveChat MVP (Phases 1-5) -- SHIPPED 2026-03-19</summary>

- [x] Phase 1: Foundation (3/3 plans) -- completed 2026-03-19
- [x] Phase 2: Signaling & Discovery (3/3 plans) -- completed 2026-03-19
- [x] Phase 3: Relay Chat (3/3 plans) -- completed 2026-03-19
- [x] Phase 4: Friends (2/2 plans) -- completed 2026-03-19
- [x] Phase 5: P2P Upgrade (3/3 plans) -- completed 2026-03-19

Full details: [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)

</details>

<details>
<summary>v1.0.1 Bug Fix & UX Polish (Phases 6-8) -- SHIPPED 2026-03-19</summary>

- [x] Phase 6: Chat Bug Fixes (2/2 plans) -- completed 2026-03-19
- [x] Phase 7: Input UX (2/2 plans) -- completed 2026-03-19
- [x] Phase 8: Visual Polish (2/2 plans) -- completed 2026-03-19

</details>

<details>
<summary>v1.1 Settings & Cleanup (Phases 9-10) -- SHIPPED 2026-03-20</summary>

- [x] Phase 9: Settings Command (2/2 plans) -- completed 2026-03-20
- [x] Phase 10: Command Cleanup -- completed 2026-03-19

</details>

<details>
<summary>v1.2 Deploy & Publish (Phases 11-13) -- SHIPPED 2026-03-20</summary>

- [x] Phase 11: Server Deploy (3/3 plans) -- completed 2026-03-20
- [x] Phase 12: npm Publish (2/2 plans) -- completed 2026-03-20
- [x] Phase 13: Documentation (1/1 plans) -- completed 2026-03-20

</details>

### v1.3 Infrastructure Optimization

- [x] **Phase 14: Server Optimization** - getNearbyUsers 공간 인덱싱 + broadcastToRegistered 지역 기반 전송 + notifyFriendSubscribers 역 인덱스 (completed 2026-03-20)
- [ ] **Phase 15: Deploy & Verification** - 최적화된 서버 Fly.io 배포 + 크로스 네트워크 P2P 테스트

## Phase Details

### Phase 14: Server Optimization
**Goal**: 서버의 broadcast/presence/friend-notify가 전체 순회(O(N)) 없이 지역 기반으로 동작하여 10K-1M 사용자 규모에서도 효율적이다
**Depends on**: Nothing (기존 서버 코드 기반)
**Requirements**: SOPT-01, SOPT-02, SOPT-03
**Plans:** 2/2 plans complete

Plans:
- [ ] 14-01-PLAN.md -- Geohash 공간 인덱스 + 친구 역 인덱스
- [ ] 14-02-PLAN.md -- 지역 기반 broadcast (broadcastToNearby)

**Success Criteria** (what must be TRUE):
  1. getNearbyUsers가 geohash 기반 공간 인덱스를 사용하여 전체 Map 순회 없이 반경 내 사용자를 반환한다
  2. broadcastToRegistered가 USER_JOINED/USER_LEFT를 해당 사용자 반경 내 사용자에게만 전송한다 (전체 클라이언트 broadcast 아님)
  3. notifyFriendSubscribers가 역 인덱스를 사용하여 친구 구독자를 O(1) 조회하고, 전체 사용자 순회 없이 알림을 전송한다
  4. 기존 기능(사용자 발견, 친구 상태 알림)이 최적화 후에도 동일하게 동작한다 (regression 없음)

### Phase 15: Deploy & Verification
**Goal**: 최적화된 서버가 프로덕션에 배포되어 실제 네트워크 환경에서 P2P 채팅이 정상 동작한다
**Depends on**: Phase 14 (최적화된 서버 코드가 완성되어야 배포 가능)
**Requirements**: DPLY-01, DPLY-02
**Plans**: TBD

**Success Criteria** (what must be TRUE):
  1. 최적화된 서버가 Fly.io에 배포되어 WebSocket 연결 + 사용자 발견이 정상 동작한다
  2. 서로 다른 네트워크(Wi-Fi vs 모바일 핫스팟 등)의 두 클라이언트가 서버를 통해 서로를 발견한다
  3. 발견된 두 클라이언트가 P2P 연결을 수립하고 양방향 메시지를 주고받는다
  4. P2P 직접 연결 실패 시 relay fallback 없이 적절한 에러 메시지가 표시된다 (v1.2에서 relay 제거됨)

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 3/3 | Complete | 2026-03-19 |
| 2. Signaling & Discovery | v1.0 | 3/3 | Complete | 2026-03-19 |
| 3. Relay Chat | v1.0 | 3/3 | Complete | 2026-03-19 |
| 4. Friends | v1.0 | 2/2 | Complete | 2026-03-19 |
| 5. P2P Upgrade | v1.0 | 3/3 | Complete | 2026-03-19 |
| 6. Chat Bug Fixes | v1.0.1 | 2/2 | Complete | 2026-03-19 |
| 7. Input UX | v1.0.1 | 2/2 | Complete | 2026-03-19 |
| 8. Visual Polish | v1.0.1 | 2/2 | Complete | 2026-03-19 |
| 9. Settings Command | v1.1 | 2/2 | Complete | 2026-03-20 |
| 10. Command Cleanup | v1.1 | 1/1 | Complete | 2026-03-19 |
| 11. Server Deploy | v1.2 | 3/3 | Complete | 2026-03-20 |
| 12. npm Publish | v1.2 | 2/2 | Complete | 2026-03-20 |
| 13. Documentation | v1.2 | 1/1 | Complete | 2026-03-20 |
| 14. Server Optimization | 2/2 | Complete   | 2026-03-20 | - |
| 15. Deploy & Verification | v1.3 | 0/? | Not started | - |

---
*Created: 2026-03-19 (v1.0)*
*Updated: 2026-03-21 (v1.3 Phase 14 planned)*
