# Requirements: Cling Talk

**Defined:** 2026-03-20
**Core Value:** 터미널을 떠나지 않고 근처 개발자들과 즉시 대화할 수 있어야 한다

## v1.1 Requirements

### Settings

- [x] **SET-01**: /settings 입력 시 설정 메뉴가 표시됨
- [x] **SET-02**: 설정 메뉴에서 닉네임을 변경할 수 있음 (TAG 유지)
- [x] **SET-03**: 설정 메뉴에서 AI CLI를 변경할 수 있음
- [x] **SET-04**: 설정 메뉴에서 현재 프로필 정보를 확인할 수 있음

### Cleanup

- [ ] **CLN-01**: /chat placeholder 명령어가 제거됨

## Future Requirements

### Deferred

- **disconnected 이벤트 emit** — offline 상태 표시 수정 (tech debt)
- **클라이언트 zod 검증** — type assertion 대체
- **그룹 채팅** — v2 고려

## Out of Scope

| Feature | Reason |
|---------|--------|
| 메시지 영구 저장/히스토리 | 의도적 휘발성 설계 |
| 웹/모바일 클라이언트 | CLI 전용 |
| 파일 전송 | 텍스트 메시지만 |
| OAuth/이메일 인증 | 익명 자동생성 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SET-01 | Phase 9 | Complete |
| SET-02 | Phase 9 | Complete |
| SET-03 | Phase 9 | Complete |
| SET-04 | Phase 9 | Complete |
| CLN-01 | Phase 10 | Pending |

**Coverage:**
- v1.1 requirements: 5 total
- Mapped to phases: 5
- Unmapped: 0

---
*Requirements defined: 2026-03-20*
*Last updated: 2026-03-20 after roadmap creation*
