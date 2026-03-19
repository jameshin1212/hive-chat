# Roadmap: Cling Talk

## Milestones

- [x] **v1.0 Cling Talk MVP** -- Phases 1-5 (shipped 2026-03-19)
- [x] **v1.0.1 Bug Fix & UX Polish** -- Phases 6-8 (shipped 2026-03-19)
- [x] **v1.1 Settings & Cleanup** -- Phases 9-10 (shipped 2026-03-20)
- [ ] **v1.2 Deploy & Publish** -- Phases 11-13

## Phases

<details>
<summary>v1.0 Cling Talk MVP (Phases 1-5) -- SHIPPED 2026-03-19</summary>

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

### v1.2 Deploy & Publish

- [ ] **Phase 11: Server Deploy** - Fly.io에 신호 서버 배포 + DEFAULT_SERVER_URL 변경 + 동작 검증
- [ ] **Phase 12: npm Publish** - 패키지 메타데이터 완비 + 번들 크기 최적화 + npm publish
- [ ] **Phase 13: Documentation** - README.md 작성 (설치/실행/기능/스크린샷)

## Phase Details

### Phase 11: Server Deploy
**Goal**: 신호 서버가 Fly.io에 배포되어 클라이언트가 공용 서버에 접속할 수 있다
**Depends on**: Nothing (기존 서버 코드 기반)
**Requirements**: DEP-01, DEP-02, DEP-03
**Success Criteria** (what must be TRUE):
  1. Fly.io에 서버가 배포되어 외부에서 WebSocket 연결이 가능하다
  2. 클라이언트의 DEFAULT_SERVER_URL이 Fly.io 배포 URL을 가리킨다
  3. 배포된 서버에서 사용자 발견(presence) + 1:1 채팅(relay)이 정상 동작한다
  4. 서버 재시작 후에도 새 연결이 정상적으로 수립된다
**Plans**: TBD

### Phase 12: npm Publish
**Goal**: `npx cling-talk` 한 줄로 누구나 즉시 실행할 수 있다
**Depends on**: Phase 11 (배포된 서버 URL이 번들에 포함되어야 함)
**Requirements**: PUB-01, PUB-02, PUB-03
**Success Criteria** (what must be TRUE):
  1. `npx cling-talk` 실행 시 설치 없이 즉시 TUI가 표시된다
  2. 패키지 크기가 1MB 미만이다 (`npm pack` 결과 확인)
  3. package.json의 bin, files, repository, keywords, description이 모두 올바르게 설정되어 있다
  4. npmjs.com 패키지 페이지에서 프로젝트 정보가 정상 표시된다
**Plans**: TBD

### Phase 13: Documentation
**Goal**: 처음 보는 사용자가 README만 읽고 설치부터 채팅까지 할 수 있다
**Depends on**: Phase 11, Phase 12 (설치 명령어와 서버 정보가 확정되어야 함)
**Requirements**: DOC-01
**Success Criteria** (what must be TRUE):
  1. README에 `npx cling-talk` 설치/실행 방법이 명시되어 있다
  2. 주요 기능(근처 사용자 발견, 1:1 채팅, 친구 추가, P2P)이 설명되어 있다
  3. 실제 동작 스크린샷 또는 GIF가 포함되어 있다
**Plans**: TBD

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
| 11. Server Deploy | v1.2 | 0/? | Not started | - |
| 12. npm Publish | v1.2 | 0/? | Not started | - |
| 13. Documentation | v1.2 | 0/? | Not started | - |

---
*Created: 2026-03-19 (v1.0)*
*Updated: 2026-03-20 (v1.2 roadmap created)*
