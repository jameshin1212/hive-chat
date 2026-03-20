# Requirements: HiveChat

**Defined:** 2026-03-21
**Core Value:** 터미널을 떠나지 않고 근처 개발자들과 즉시 대화할 수 있어야 한다

## v1.3 Requirements

Requirements for infrastructure optimization. 서버 broadcast/presence 지역 기반 최적화로 대규모 사용자(10K-1M) 대응.

### Server Optimization

- [x] **SOPT-01**: broadcastToRegistered가 전체 클라이언트가 아닌 반경 내 사용자에게만 USER_JOINED/USER_LEFT를 전송한다
- [x] **SOPT-02**: getNearbyUsers가 공간 인덱스(geohash 등)를 사용하여 O(N) 전체 순회 없이 근처 사용자를 조회한다
- [x] **SOPT-03**: notifyFriendSubscribers가 역 인덱스를 사용하여 O(N*F) 전체 순회 없이 구독자를 즉시 조회한다

### Deploy & Verification

- [ ] **DPLY-01**: 최적화된 서버 코드가 Fly.io에 배포되어 WebSocket 연결 + 사용자 발견이 정상 동작한다
- [ ] **DPLY-02**: 서로 다른 네트워크 환경에서 두 클라이언트가 P2P 채팅을 정상 수립한다

## Previous Requirements (v1.0-v1.2)

### Validated

- **IDEN-01~03**: 닉네임#태그 식별, AI CLI 선택, 자동 ID 발급 -- v1.0
- **DISC-01~03**: IP geolocation, 근처 사용자 목록, 온/오프라인 상태 -- v1.0
- **MESG-01~02**: 1:1 채팅 (relay + P2P), 메시지 비저장 -- v1.0
- **SOCL-01~02**: 친구 추가/삭제, 로컬 저장 -- v1.0
- **TUI-01~03**: 스플릿 레이아웃, CJK IME, 깔끔한 종료 -- v1.0
- **DIST-01**: npx 즉시 실행 -- v1.0
- **DEP-01~03**: Fly.io 배포, DEFAULT_SERVER_URL 변경, WebSocket 동작 -- v1.2
- **PUB-01~03**: npm publish, 패키지 크기 <1MB, 메타데이터 -- v1.2
- **DOC-01**: README.md -- v1.2

## Future Requirements

### Deferred

- **disconnected 이벤트 emit** -- offline 상태 표시 수정 (tech debt)
- **클라이언트 zod 검증** -- type assertion 대체
- **그룹 채팅** -- v2 고려
- **수평 스케일링 (Redis pub/sub)** -- 100K+ 동시 접속 시 멀티 프로세스 필요

## Out of Scope

| Feature | Reason |
|---------|--------|
| 메시지 영구 저장/히스토리 | 의도적 휘발성 설계 |
| 웹/모바일 클라이언트 | CLI 전용 |
| 파일 전송 | 텍스트 메시지만 |
| OAuth/이메일 인증 | 익명 자동생성 |
| Redis pub/sub 멀티 프로세스 | 단일 프로세스 최적화 우선, 100K+ 시 별도 마일스톤 |
| CI/CD 파이프라인 | 수동 배포로 충분 (v1 규모) |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SOPT-01 | Phase 14 | Complete |
| SOPT-02 | Phase 14 | Complete |
| SOPT-03 | Phase 14 | Complete |
| DPLY-01 | Phase 15 | Complete |
| DPLY-02 | Phase 15 | Complete |

**Coverage:**
- v1.3 requirements: 5 total
- Mapped to phases: 5/5
- Unmapped: 0

---
*Requirements defined: 2026-03-21*
*Last updated: 2026-03-21 after v1.3 complete*
