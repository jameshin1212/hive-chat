---
phase: 12-npm-publish
plan: 01
subsystem: infra
tags: [npm, tsdown, package-json, publish, bundler]

requires:
  - phase: 11-deploy
    provides: production server URL and workspace package structure
provides:
  - publish-ready package.json with full npm metadata (v1.2.0)
  - tsdown config file eliminating deprecated warnings
  - correct bin entry point matching build output
affects: [12-npm-publish, 13-docs]

tech-stack:
  added: []
  patterns: [tsdown config file over CLI flags]

key-files:
  created:
    - packages/client/tsdown.config.ts
  modified:
    - packages/client/package.json
    - packages/client/bin/hivechat.js

key-decisions:
  - "tsdown config file 방식 채택 -- CLI flags 대신 tsdown.config.ts로 마이그레이션하여 deprecated external 경고 제거"
  - "bin entry에서 .mjs 확장자 사용 -- tsdown ESM 출력이 index.mjs이므로 bin/hivechat.js의 import 경로를 일치시킴"

patterns-established:
  - "tsdown config file: CLI flags 대신 tsdown.config.ts에서 빌드 설정 관리"

requirements-completed: [PUB-02, PUB-03]

duration: 2min
completed: 2026-03-20
---

# Phase 12 Plan 01: Package Metadata & Build Config Summary

**npm publish-ready package.json (v1.2.0) with tsdown config migration and 16.8 kB pack size**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-20T05:07:50Z
- **Completed:** 2026-03-20T05:10:07Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- package.json에 description, keywords, license, repository, homepage, engines, author 메타데이터 완비
- version 0.1.0 -> 1.2.0 범프
- tsdown.config.ts 생성으로 deprecated external 경고 완전 제거
- bin/hivechat.js import 경로를 실제 빌드 출력(index.mjs)과 일치시킴
- npm pack 결과 16.8 kB (1MB 제한 대비 충분히 작음)

## Task Commits

Each task was committed atomically:

1. **Task 1: package.json 메타데이터 완비 + 버전 1.2.0** - `9910685` (feat)
2. **Task 2: tsdown config 정리 + 빌드 검증 + pack 크기 확인** - `55e1e90` (feat)

## Files Created/Modified
- `packages/client/package.json` - npm publish 메타데이터 추가 + 버전 1.2.0 + build script 단순화
- `packages/client/tsdown.config.ts` - tsdown 번들 설정 (deps.neverBundle로 deprecated 경고 제거)
- `packages/client/bin/hivechat.js` - import 경로 index.js -> index.mjs 수정

## Decisions Made
- tsdown config file 방식 채택: CLI flags는 길고 deprecated 경고 발생, config 파일이 유지보수 용이
- bin entry에서 .mjs 확장자 직접 사용: tsdown ESM format 기본 출력이 .mjs이므로 경로 일치

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] bin/hivechat.js import 경로 불일치**
- **Found during:** Task 2
- **Issue:** bin/hivechat.js가 `../dist/index.js`를 import하지만 tsdown ESM 출력은 `index.mjs`
- **Fix:** import 경로를 `../dist/index.mjs`로 수정
- **Files modified:** packages/client/bin/hivechat.js
- **Verification:** npm pack --dry-run으로 파일 포함 확인
- **Committed in:** 55e1e90 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Plan에서 이미 예상한 문제 (Task 2 action 3번). 정상 범위.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- package.json이 npm publish 준비 완료
- 다음 plan(12-02)에서 npm publish 실행 또는 추가 검증 가능
- pack 크기 16.8 kB로 배포에 적합

---
*Phase: 12-npm-publish*
*Completed: 2026-03-20*

## Self-Check: PASSED
