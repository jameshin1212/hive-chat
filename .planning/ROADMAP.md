# Roadmap: HiveChat

## Milestones

- [x] **v1.0 HiveChat MVP** -- Phases 1-5 (shipped 2026-03-19)
- [x] **v1.0.1 Bug Fix & UX Polish** -- Phases 6-8 (shipped 2026-03-19)
- [x] **v1.1 Settings & Cleanup** -- Phases 9-10 (shipped 2026-03-20)
- [x] **v1.2 Deploy & Publish** -- Phases 11-13 (shipped 2026-03-20)
- [x] **v1.3 Infrastructure Optimization** -- Phases 14-15 (shipped 2026-03-21)
- [ ] **v1.4 UI/UX Polish** -- Phases 16-19

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

<details>
<summary>v1.3 Infrastructure Optimization (Phases 14-15) -- SHIPPED 2026-03-21</summary>

- [x] Phase 14: Server Optimization (2/2 plans) -- completed 2026-03-20
- [x] Phase 15: Deploy & Verification -- completed 2026-03-21

</details>

### v1.4 UI/UX Polish

- [x] **Phase 16: Shared Infrastructure** - useTerminalSize hook, useInput 충돌 방어, 빌드타임 버전 주입, breakpoint 시스템 (completed 2026-03-20)
- [x] **Phase 17: Onboarding Polish** - step indicator, 시각 개선, 적응형 ASCII 배너 (completed 2026-03-20)
- [ ] **Phase 18: Welcome Section** - 프로필 카드, 버전/ASCII 배너, Tips, 자동 dismiss
- [ ] **Phase 19: Slash Command & Responsive Finish** - 슬래시 명령어 오버레이, 채팅 요청 UX, 입력 영역 최소 높이, StatusBar 축약

## Phase Details

### Phase 16: Shared Infrastructure
**Goal**: 나머지 모든 UI 작업의 기반이 되는 반응형 hook, 키 이벤트 안전성, 빌드 상수가 준비되어 모든 컴포넌트가 터미널 크기에 반응할 수 있다
**Depends on**: Nothing (v1.3 완료 기반)
**Requirements**: INFR-01, INFR-02, INFR-03, RESP-01
**Plans**: 2 plans

Plans:
- [x] 16-01-PLAN.md — useTerminalSize hook + breakpoint 상수 + ChatScreen 통합
- [x] 16-02-PLAN.md — AiCliSelector isActive 수정 + 빌드타임 버전 주입

**Success Criteria** (what must be TRUE):
  1. 터미널 크기 변경 시 모든 화면이 compact(<80)/standard(80-120)/wide(>120) breakpoint에 따라 즉시 반응한다
  2. 여러 interactive 컴포넌트가 동시에 마운트되어도 키 이벤트가 활성 컴포넌트에서만 처리된다 (비활성 컴포넌트에서 Enter/Arrow 중복 처리 없음)
  3. 앱 내 버전 표시가 package.json 버전과 일치하며, 빌드 후 런타임에서 파일 읽기 없이 접근 가능하다
  4. breakpoint 변경이 하위 컴포넌트에 prop으로 전달되어 각 컴포넌트가 layout에 따라 렌더링을 분기할 수 있다

### Phase 17: Onboarding Polish
**Goal**: 첫 실행 사용자가 닉네임/AI CLI 설정 과정에서 현재 위치와 전체 진행 상태를 명확히 인지하며, 터미널 크기에 관계없이 깔끔한 UI를 본다
**Depends on**: Phase 16 (useTerminalSize로 배너 적응형 표시, useInput isActive로 step 전환 안전성)
**Requirements**: ONBD-01, ONBD-02, ONBD-03
**Plans**: 1 plan

Plans:
- [ ] 17-01-PLAN.md — AsciiBanner 적응형 렌더링 + OnboardingScreen 통합 개선

**Success Criteria** (what must be TRUE):
  1. 온보딩 각 단계에서 "Step 1/2", "Step 2/2" 형태의 진행 indicator가 표시된다
  2. 닉네임 입력, AI CLI 선택 영역이 Box border로 시각적으로 구분되어 입력 영역이 명확하다
  3. 넓은 터미널(>=80col)에서 figlet ASCII 배너가 표시되고, 좁은 터미널(<80col)에서 plain text로 graceful degradation된다
  4. 한글 IME 조합(ㅎ+ㅏ+ㄴ=한)이 온보딩 UI 변경 후에도 정상 동작한다 (regression 없음)

### Phase 18: Welcome Section
**Goal**: 사용자가 채팅 대기 중(lobby) 빈 화면 대신 자신의 프로필, 앱 버전, 사용법 안내를 보며, 채팅이 시작되면 자연스럽게 메시지 화면으로 전환된다
**Depends on**: Phase 16 (버전 상수, breakpoint), Phase 17 (StepIndicator 등 컴포넌트 패턴 확립)
**Requirements**: WELC-01, WELC-02, WELC-03, WELC-04
**Plans**: 1 plan

Plans:
- [x] 18-01-PLAN.md — 웰컴 시스템 메시지 (배너+프로필+버전+Tips) + WelcomeBack splash 제거

**Success Criteria** (what must be TRUE):
  1. ChatScreen lobby 상태에서 프로필 카드(닉네임#태그, AI CLI, 연결 상태)가 표시된다
  2. Welcome 영역에 HiveChat 버전과 ASCII 아트 배너가 표시되며, 버전이 실제 package.json과 일치한다
  3. Tips 영역에 슬래시 명령어, 친구 추가 등 사용법 안내가 표시된다
  4. 메시지 전송 또는 수신 시 Welcome 섹션이 자동으로 사라지고 메시지 영역이 전체를 차지한다
  5. App.tsx의 기존 WelcomeBack splash(setTimeout 기반)가 제거되고 WelcomeSection으로 대체된다

### Phase 19: Slash Command & Responsive Finish
**Goal**: 슬래시 명령어 입력이 Claude Code 스타일의 오버레이로 안내되고, 모든 터미널 크기에서 채팅 입력 영역과 StatusBar가 적절히 표시된다
**Depends on**: Phase 16 (breakpoint), Phase 18 (ChatScreen 레이아웃 변경 반영)
**Requirements**: SLSH-01, SLSH-02, CHAT-01, CHAT-02, RESP-02, RESP-03
**Plans**: TBD

**Success Criteria** (what must be TRUE):
  1. `/` 입력 시 명령어 목록이 오버레이로 표시되며, 각 항목에 명령어명과 설명이 정렬되어 보인다
  2. 오버레이에서 화살표로 항목을 선택하고 Enter를 누르면 해당 명령어가 즉시 실행된다
  3. 채팅 요청 오버레이가 Box border + 색상 강조로 시각적으로 눈에 띄어 사용자가 즉시 인지한다
  4. 수락/거절 액션이 직관적 UI로 표시되어 행동이 명확하다
  5. 터미널 높이가 작아도 채팅 입력 영역이 최소 높이(1줄 이상)를 보장하여 입력이 가려지지 않는다
  6. compact 모드(<80col)에서 StatusBar 정보가 축약 표시되어 좁은 터미널에서도 읽을 수 있다

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
| 14. Server Optimization | v1.3 | 2/2 | Complete | 2026-03-20 |
| 15. Deploy & Verification | v1.3 | - | Complete | 2026-03-21 |
| 16. Shared Infrastructure | v1.4 | Complete    | 2026-03-20 | 2026-03-20 |
| 17. Onboarding Polish | 1/1 | Complete    | 2026-03-20 | - |
| 18. Welcome Section | v1.4 | 1/1 | Complete | 2026-03-20 |
| 19. Slash Command & Responsive Finish | v1.4 | 0/? | Not started | - |

---
*Created: 2026-03-19 (v1.0)*
*Updated: 2026-03-21 (v1.4 Phase 18 planned)*
