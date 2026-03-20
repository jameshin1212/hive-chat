# Requirements: HiveChat

**Defined:** 2026-03-21
**Core Value:** 터미널을 떠나지 않고 근처 개발자들과 즉시 대화할 수 있어야 한다

## v1.4 Requirements

Requirements for UI/UX Polish. 온보딩 개선, 웰컴 섹션, 슬래시 명령어 UX, 반응형 레이아웃으로 사용자 경험 향상.

### Shared Infrastructure

- [x] **INFR-01**: useTerminalSize hook으로 터미널 크기 감지 + breakpoint 계산 (compact/standard/wide)
- [x] **INFR-02**: 기존 컴포넌트의 useInput에 isActive prop 추가하여 키 이벤트 충돌 방지
- [x] **INFR-03**: package.json 버전을 tsdown define으로 빌드타임 주입

### Onboarding Polish

- [x] **ONBD-01**: 온보딩 화면에 step indicator 표시 (1/2, 2/2)
- [x] **ONBD-02**: 온보딩 화면 Box border/style 시각 개선
- [x] **ONBD-03**: 터미널 폭에 따라 ASCII 배너 적응형 표시 (축소/숨김)

### Welcome Section

- [ ] **WELC-01**: ChatScreen에 프로필 카드 표시 (닉네임#태그, AI CLI, 연결 상태)
- [ ] **WELC-02**: HiveChat 버전 + ASCII 아트 배너 표시
- [ ] **WELC-03**: 사용법 안내 Tips 영역 표시
- [ ] **WELC-04**: 채팅 시작 시 웰컴 섹션 자동 dismiss

### Slash Command UX

- [ ] **SLSH-01**: Claude Code 스타일 슬래시 명령어 오버레이 UI (명령어명 + 설명, 하이라이트, 정렬)
- [ ] **SLSH-02**: 오버레이에서 엔터 입력 시 선택된 명령어 즉시 실행

### Chat Request UX

- [ ] **CHAT-01**: 채팅 요청 오버레이가 시각적으로 강조되어 (Box border, 색상 강조) 사용자가 즉시 인지할 수 있다
- [ ] **CHAT-02**: 수락/거절 액션이 직관적 UI로 표시되어 행동이 명확하다

### Responsive Layout

- [x] **RESP-01**: compact(<80)/standard(80-120)/wide(>120) 3단계 breakpoint 시스템
- [ ] **RESP-02**: 채팅 입력 영역 최소 높이 보장 (터미널 크기 무관)
- [ ] **RESP-03**: 좁은 터미널에서 StatusBar 정보 축약 표시

## Previous Requirements (v1.0-v1.3)

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
- **SOPT-01~03**: geohash 공간 인덱싱, 지역 기반 broadcast, 역 인덱스 -- v1.3
- **DPLY-01~02**: Fly.io 재배포, P2P 크로스 네트워크 테스트 -- v1.3

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
| 수평 사이드 패널 (wide 터미널) | 레이아웃 아키텍처 변경 필요, v2 고려 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SOPT-01 | Phase 14 | Complete |
| SOPT-02 | Phase 14 | Complete |
| SOPT-03 | Phase 14 | Complete |
| DPLY-01 | Phase 15 | Complete |
| DPLY-02 | Phase 15 | Complete |
| INFR-01 | Phase 16 | Complete |
| INFR-02 | Phase 16 | Complete |
| INFR-03 | Phase 16 | Complete |
| RESP-01 | Phase 16 | Complete |
| ONBD-01 | Phase 17 | Complete |
| ONBD-02 | Phase 17 | Complete |
| ONBD-03 | Phase 17 | Complete |
| WELC-01 | Phase 18 | Pending |
| WELC-02 | Phase 18 | Pending |
| WELC-03 | Phase 18 | Pending |
| WELC-04 | Phase 18 | Pending |
| SLSH-01 | Phase 19 | Pending |
| SLSH-02 | Phase 19 | Pending |
| CHAT-01 | Phase 19 | Pending |
| CHAT-02 | Phase 19 | Pending |
| RESP-02 | Phase 19 | Pending |
| RESP-03 | Phase 19 | Pending |

**Coverage:**
- v1.4 requirements: 17 total
- Mapped to phases: 17/17
- Unmapped: 0

---
*Requirements defined: 2026-03-21*
*Last updated: 2026-03-21 after v1.4 roadmap created*
