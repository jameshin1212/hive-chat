# Requirements: Cling Talk

**Defined:** 2026-03-19
**Core Value:** 터미널을 떠나지 않고 근처 개발자들과 즉시 대화할 수 있어야 한다

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Identity

- [x] **IDEN-01**: 최초 실행 시 닉네임 입력 + 고유태그 자동발급 (nick#1234 형식)
- [x] **IDEN-02**: AI CLI 도구 선택 (Claude Code, Codex, Gemini, Cursor 등) 및 뱃지 표시
- [x] **IDEN-03**: 온라인/오프라인 상태가 다른 사용자에게 실시간 표시

### Discovery

- [x] **DISC-01**: 신호 서버가 IP geolocation으로 사용자 위치 파악
- [x] **DISC-02**: 근처 사용자 목록 조회 (메트로/도시 수준 정확도)
- [x] **DISC-03**: 거리 범위 필터 선택 (1/3/5/10km)

### Messaging

- [x] **MESG-01**: 1:1 P2P 채팅 (직접 연결 우선, relay fallback)
- [x] **MESG-02**: 메시지 비저장 — 세션 동안 터미널에만 표시, 종료 시 소멸
- [x] **MESG-03**: 연결 끊김 시 자동 재연결 및 graceful disconnect 처리

### Social

- [ ] **SOCL-01**: 고유ID(nick#tag)로 위치 무관 친구추가/삭제
- [ ] **SOCL-02**: 친구 목록 로컬 파일 저장 (세션 간 유지)
- [ ] **SOCL-03**: 원격 친구와 P2P 연결 (NAT traversal + relay fallback)
- [x] **SOCL-04**: 새 메시지 수신 시 터미널 알림 (bell/notification)

### TUI

- [x] **TUI-01**: 스플릿 레이아웃 (메시지 영역 + 입력 영역)
- [x] **TUI-02**: 한글/CJK IME 조합 정상 처리 — 입력 중 밀림/깨짐 없음
- [ ] **TUI-03**: 연결 상태 표시 (direct/relay/disconnected)
- [x] **TUI-04**: Ctrl+C 또는 /quit으로 깔끔한 종료

### Distribution

- [x] **DIST-01**: npm 패키지로 배포, npx cling-talk으로 즉시 실행

## v2 Requirements

### Group Chat

- **GRUP-01**: 근처 사용자 또는 친구로 그룹 채팅 생성
- **GRUP-02**: 그룹 내 메시지 전체 참여자에게 전달
- **GRUP-03**: 그룹 참여자 초대/퇴장

### Customization

- **CUST-01**: 컬러 테마 선택 (dark, light, hacker green)
- **CUST-02**: Identity 파일 export/import (다른 기기에서 사용)

## Out of Scope

| Feature | Reason |
|---------|--------|
| 메시지 영구 저장/히스토리 | 의도적 휘발성 설계 — 프라이버시 기능 |
| 파일 전송 | P2P 파일 전송 복잡도 높음, v1은 텍스트만 |
| 음성/영상 통화 | 터미널 제약상 비현실적 |
| E2E 암호화 (커스텀) | P2P 직접 연결이 transport security 제공. 반쪽짜리 암호화보다 안 하는 게 나음 |
| OAuth/이메일 인증 | 가입 장벽 제거. 익명 자동생성이 프로젝트 목적에 부합 |
| 채널/방 시스템 | 영속적 방 관리는 스코프 확대. ad-hoc 그룹으로 충분 |
| 리치 텍스트/마크다운 | 터미널 렌더링 불안정. 플레인 텍스트 유지 |
| GPS 정밀 위치 | CLI는 데스크톱 도구, GPS 없음. IP geolocation이 현실적 |
| 웹/모바일 클라이언트 | CLI 전용이 아이덴티티. 분리 프로젝트로 고려 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| IDEN-01 | Phase 1 | Complete |
| IDEN-02 | Phase 1 | Complete |
| IDEN-03 | Phase 2 | Complete |
| DISC-01 | Phase 2 | Complete |
| DISC-02 | Phase 2 | Complete |
| DISC-03 | Phase 2 | Complete |
| MESG-01 | Phase 3 | Complete |
| MESG-02 | Phase 3 | Complete |
| MESG-03 | Phase 3 | Complete |
| SOCL-01 | Phase 4 | Pending |
| SOCL-02 | Phase 4 | Pending |
| SOCL-03 | Phase 5 | Pending |
| SOCL-04 | Phase 3 | Complete |
| TUI-01 | Phase 1 | Complete |
| TUI-02 | Phase 1 | Complete |
| TUI-03 | Phase 5 | Pending |
| TUI-04 | Phase 1 | Complete |
| DIST-01 | Phase 1 | Complete |

**Coverage:**
- v1 requirements: 18 total
- Mapped to phases: 18
- Unmapped: 0

---
*Requirements defined: 2026-03-19*
*Last updated: 2026-03-19 after roadmap creation*
