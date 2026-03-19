# Roadmap: Cling Talk

## Milestones

- [x] **v1.0 Cling Talk MVP** -- Phases 1-5 (shipped 2026-03-19)
- [ ] **v1.0.1 Bug Fix & UX Polish** -- Phases 6-8

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

### v1.0.1 Bug Fix & UX Polish

- [ ] **Phase 6: Chat Bug Fixes** - input text visibility and scroll rendering bugs
- [ ] **Phase 7: Input UX** - cursor navigation and slash command autocomplete
- [ ] **Phase 8: Visual Polish** - status bar relocation, message color differentiation, command rename

## Phase Details

### Phase 6: Chat Bug Fixes
**Goal**: 채팅 중 입력 텍스트가 사라지거나 메시지 영역이 깨지는 문제가 해결되어 안정적으로 대화할 수 있다
**Depends on**: Nothing (independent bug fixes)
**Requirements**: BUG-01, BUG-02
**Success Criteria** (what must be TRUE):
  1. 터미널 폭보다 긴 텍스트를 입력해도 현재 입력 중인 내용이 항상 보인다
  2. 메시지가 50개 이상 쌓여도 채팅 영역이 최신 메시지 방향으로 정상 스크롤된다
  3. 스크롤 후에도 상단에 이전 메시지가 고정되어 남는 현상이 발생하지 않는다
**Plans**: TBD

### Phase 7: Input UX
**Goal**: 입력 필드에서 커서 이동과 명령어 자동완성이 가능하여 빠르고 편리하게 입력할 수 있다
**Depends on**: Phase 6 (입력 필드 버그 수정 후 기능 추가)
**Requirements**: INP-01, INP-02, INP-03
**Success Criteria** (what must be TRUE):
  1. 입력 필드에서 좌/우 화살표 키를 눌러 커서를 원하는 위치로 이동할 수 있다
  2. 커서 중간 위치에서 문자를 입력하면 해당 위치에 삽입된다
  3. `/` 입력 시 사용 가능한 명령어 목록이 자동으로 표시된다
  4. 화살표 키로 자동완성 목록에서 명령어를 선택하고 Enter로 확정할 수 있다
**Plans**: TBD

### Phase 8: Visual Polish
**Goal**: 메시지와 UI 요소의 시각적 구분이 명확하여 채팅 내용을 한눈에 파악할 수 있다
**Depends on**: Phase 6 (스크롤/레이아웃 버그 수정 후 시각 변경)
**Requirements**: VIS-01, VIS-02, VIS-03, CMD-01
**Success Criteria** (what must be TRUE):
  1. 상태바가 입력 필드 바로 윗 라인에 위치한다
  2. 시스템 메시지(입장/퇴장/연결 상태 등)가 사용자 채팅 메시지와 시각적으로 구분된다
  3. 내가 보낸 메시지와 상대방이 보낸 메시지의 텍스트 색상이 다르다
  4. `/exit` 명령어로 앱을 종료할 수 있다 (기존 `/quit` 대체)
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 3/3 | Complete | 2026-03-19 |
| 2. Signaling & Discovery | v1.0 | 3/3 | Complete | 2026-03-19 |
| 3. Relay Chat | v1.0 | 3/3 | Complete | 2026-03-19 |
| 4. Friends | v1.0 | 2/2 | Complete | 2026-03-19 |
| 5. P2P Upgrade | v1.0 | 3/3 | Complete | 2026-03-19 |
| 6. Chat Bug Fixes | v1.0.1 | 0/? | Not started | - |
| 7. Input UX | v1.0.1 | 0/? | Not started | - |
| 8. Visual Polish | v1.0.1 | 0/? | Not started | - |

---
*Created: 2026-03-19 (v1.0)*
*Updated: 2026-03-20 (v1.0.1 phases added)*
