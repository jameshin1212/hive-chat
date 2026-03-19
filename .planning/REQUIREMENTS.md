# Requirements: Cling Talk

**Defined:** 2026-03-20
**Core Value:** 터미널을 떠나지 않고 근처 개발자들과 즉시 대화할 수 있어야 한다

## v1.2 Requirements

### Publish

- [ ] **PUB-01**: `npm publish` 후 `npx cling-talk`으로 즉시 실행 가능
- [ ] **PUB-02**: 패키지 크기 1MB 미만 (tsdown 번들)
- [ ] **PUB-03**: package.json에 bin, files, repository 등 메타데이터 완비

### Deploy

- [ ] **DEP-01**: Fly.io에 신호 서버 배포 완료 (Dockerfile + fly.toml)
- [ ] **DEP-02**: DEFAULT_SERVER_URL이 Fly.io 배포 URL로 변경됨
- [ ] **DEP-03**: 배포 서버에서 WebSocket 연결 + 채팅 정상 동작

### Documentation

- [ ] **DOC-01**: README.md에 설치/실행 방법, 주요 기능, 스크린샷 포함

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
| CI/CD 파이프라인 | 수동 배포로 충분 (v1 규모) |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PUB-01 | — | Pending |
| PUB-02 | — | Pending |
| PUB-03 | — | Pending |
| DEP-01 | — | Pending |
| DEP-02 | — | Pending |
| DEP-03 | — | Pending |
| DOC-01 | — | Pending |

**Coverage:**
- v1.2 requirements: 7 total
- Mapped to phases: 0
- Unmapped: 7 ⚠️

---
*Requirements defined: 2026-03-20*
*Last updated: 2026-03-20 after initial definition*
