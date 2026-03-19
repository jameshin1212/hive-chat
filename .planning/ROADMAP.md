# Roadmap: Cling Talk

## Milestones

- [x] **v1.0 Cling Talk MVP** -- Phases 1-5 (shipped 2026-03-19)
- [x] **v1.0.1 Bug Fix & UX Polish** -- Phases 6-8 (shipped 2026-03-19)
- [ ] **v1.1 Settings & Cleanup** -- Phases 9-10

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

### v1.1 Settings & Cleanup

- [x] **Phase 9: Settings Command** - /settings 명령어로 닉네임 변경, AI CLI 변경, 프로필 확인
- [x] **Phase 10: Command Cleanup** - /chat placeholder 명령어 제거 (completed 2026-03-19)

## Phase Details

### Phase 9: Settings Command
**Goal**: 사용자가 /settings 명령어를 통해 자신의 프로필을 확인하고 닉네임과 AI CLI를 변경할 수 있다
**Depends on**: Nothing (v1.0 기능 기반, 독립 기능 추가)
**Requirements**: SET-01, SET-02, SET-03, SET-04
**Success Criteria** (what must be TRUE):
  1. /settings 입력 시 설정 메뉴 화면이 표시되고, 채팅 화면에서 벗어나 설정 전용 UI가 보인다
  2. 설정 메뉴에서 닉네임을 변경하면 TAG는 유지된 채 새 닉네임이 즉시 반영되고, 서버에 업데이트된 닉네임이 전파된다
  3. 설정 메뉴에서 AI CLI를 변경하면 새 뱃지가 즉시 반영되고, 다른 사용자에게도 변경된 뱃지가 보인다
  4. 설정 메뉴에서 현재 닉네임, TAG, AI CLI 등 프로필 정보를 확인할 수 있다
**Plans:** 2 plans
Plans:
- [x] 09-01-PLAN.md -- updateIdentity() + SettingsOverlay 컴포넌트 + App identity 콜백
- [x] 09-02-PLAN.md -- ChatScreen 통합 + /settings 명령어 연결 + 동작 검증

### Phase 10: Command Cleanup
**Goal**: 사용되지 않는 placeholder 명령어가 제거되어 명령어 목록이 깔끔하다
**Depends on**: Nothing (독립 작업, Phase 9과 병렬 가능)
**Requirements**: CLN-01
**Success Criteria** (what must be TRUE):
  1. /chat 입력 시 명령어로 인식되지 않고 일반 메시지로 전송되거나 "알 수 없는 명령어" 안내가 표시된다
  2. 명령어 자동완성 목록에 /chat이 나타나지 않는다
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
| 10. Command Cleanup | v1.1 | Complete    | 2026-03-19 | - |

---
*Created: 2026-03-19 (v1.0)*
*Updated: 2026-03-20 (v1.1 Phase 9 planned)*
