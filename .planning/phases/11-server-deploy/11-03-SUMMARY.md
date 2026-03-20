---
phase: 11-server-deploy
plan: 03
subsystem: infra
tags: [fly.io, docker, deploy, websocket, rename]

requires:
  - phase: 11-server-deploy/11-01
    provides: HiveChat code renaming
  - phase: 11-server-deploy/11-02
    provides: Dockerfile, fly.toml, doc renaming
provides:
  - Live signaling server at wss://hivechat-signal.fly.dev
  - WebSocket connectivity verified
affects: [phase-12-npm-publish, phase-13-documentation]

tech-stack:
  added: [fly.io]
  patterns: [docker-multi-stage, workspace-exports-patching]

key-files:
  modified:
    - Dockerfile
    - fly.toml
    - .dockerignore
    - packages/shared/src/constants.ts
    - packages/shared/package.json
    - packages/server/src/SignalingServer.ts

key-decisions:
  - "Fly.io app name: hivechat-signal (hivechat was taken)"
  - "HTTP server wrapping WebSocket for Fly.io proxy compatibility"
  - "shared exports: .ts for dev (tsx), patched to .mjs in Docker build"
  - "shared build script added for production dist generation"

patterns-established:
  - "Docker build patches shared/package.json exports for production"
  - "HTTP createServer wraps WebSocketServer for cloud proxy compat"

requirements-completed: [DEP-01, DEP-02, DEP-03]

duration: 25min
completed: 2026-03-20
---

# Phase 11: Plan 03 Summary

**Fly.io deployment with 7 iteration fixes for Docker/WebSocket/shared module resolution**

## Performance

- **Duration:** ~25 min (including 7 fix iterations)
- **Tasks:** 2 (1 deploy + 1 manual checkpoint)

## Accomplishments
- hivechat-signal.fly.dev 서버 배포 성공
- WebSocket 연결 정상 확인 (wss://hivechat-signal.fly.dev)
- 클라이언트가 Fly.io 서버에 자동 접속 확인

## Deviations from Plan

### Fix Iterations

**1. hivechat 앱 이름 사용 불가** → hivechat-signal 사용
**2. .dockerignore가 client/package.json 제외** → client src/bin/dist만 제외
**3. root tsconfig.json 누락** → Dockerfile에 추가
**4. dist/index.js vs dist/index.mjs** → CMD 경로 수정
**5. Fly.io HTTP 프록시 호환** → http.createServer로 WebSocket 래핑
**6. @hivechat/shared 모듈 미발견** → shared 빌드 + exports 패치
**7. 로컬 dev에서 shared dist 참조** → exports를 .ts로 유지, Docker에서만 패치

---

**Total deviations:** 7 fixes (Docker/deploy 환경 차이)
**Impact:** 모든 수정은 production 배포에 필수. 로컬 dev 동작 영향 없음.

## Next Phase Readiness
- 서버 배포 완료, npm publish 가능 상태
- DEFAULT_SERVER_URL이 wss://hivechat-signal.fly.dev로 설정됨

---
*Phase: 11-server-deploy*
*Completed: 2026-03-20*
