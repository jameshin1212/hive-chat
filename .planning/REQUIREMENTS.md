# Requirements: Cling Talk

**Defined:** 2026-03-20
**Core Value:** 터미널을 떠나지 않고 근처 개발자들과 즉시 대화할 수 있어야 한다

## v1.0.1 Requirements

Requirements for bug fix & UX polish release. Each maps to roadmap phases.

### Bug Fix

- [x] **BUG-01**: 채팅 입력이 길어지면 입력 중인 텍스트가 보이지 않는 문제 수정
- [x] **BUG-02**: 메시지가 많아지면 채팅 영역 상단 일부가 고정된 채 스크롤되는 문제 수정

### Input UX

- [x] **INP-01**: 입력 필드에서 좌/우 화살표 키로 커서 이동 가능
- [x] **INP-02**: `/` 입력 시 명령어 자동완성 목록 표시
- [x] **INP-03**: 자동완성 목록에서 화살표 키로 명령어 선택 가능

### Visual UX

- [ ] **VIS-01**: 상태바를 입력 필드 윗 라인으로 이동
- [x] **VIS-02**: 시스템 메시지가 사용자 메시지와 시각적으로 명확히 구분됨
- [x] **VIS-03**: 내 메시지와 상대방 메시지의 텍스트 색상이 다르게 표시됨

### Command

- [ ] **CMD-01**: `/quit` 명령어를 `/exit`로 변경

## Future Requirements

### Deferred from v1.0

- **disconnected 이벤트 emit** -- offline 상태 표시 수정 (tech debt)
- **/settings, /chat 명령어 구현** -- v1.0에서 placeholder
- **클라이언트 zod 검증** -- type assertion 대체

## Out of Scope

| Feature | Reason |
|---------|--------|
| 메시지 영구 저장/히스토리 | 의도적 휘발성 설계 |
| 웹/모바일 클라이언트 | CLI 전용 |
| 파일 전송 | 텍스트 메시지만 |
| OAuth/이메일 인증 | 익명 자동생성 |
| 그룹 채팅 | v2 고려 |
| /users, /friends 화살표 선택 | 이미 v1.0에서 구현됨 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| BUG-01 | Phase 6 | Complete |
| BUG-02 | Phase 6 | Complete |
| INP-01 | Phase 7 | Complete |
| INP-02 | Phase 7 | Complete |
| INP-03 | Phase 7 | Complete |
| VIS-01 | Phase 8 | Pending |
| VIS-02 | Phase 8 | Complete |
| VIS-03 | Phase 8 | Complete |
| CMD-01 | Phase 8 | Pending |

**Coverage:**
- v1.0.1 requirements: 9 total
- Mapped to phases: 9
- Unmapped: 0

---
*Requirements defined: 2026-03-20*
*Last updated: 2026-03-20 -- traceability updated with phase mappings*
