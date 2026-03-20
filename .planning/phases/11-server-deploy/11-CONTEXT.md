# Phase 11: Server Deploy - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

프로젝트 전체 리네이밍 (Cling Talk → HiveChat) + 신호 서버 Fly.io 배포 + DEFAULT_SERVER_URL 변경. npm publish와 README는 Phase 12, 13에서 처리.

</domain>

<decisions>
## Implementation Decisions

### 리네이밍: Cling Talk → HiveChat
- **전체 범위**: 코드, 패키지, TUI, 플래닝 문서, GitHub repo, 로컬 폴더 모두 변경
- npm 패키지명: `hivechat` (사용 가능 확인 완료)
- CLI 명령어: `npx hivechat`
- bin entry: `bin/hivechat.js`
- conf projectName: `hivechat` (기존 `cling-talk` → `hivechat`)
- shared constants: 프로젝트명, 서버 URL 등
- TUI: ASCII 배너 "HIVECHAT", StatusBar, 시스템 메시지
- 플래닝 문서: PROJECT.md, CLAUDE.md, rules, ROADMAP.md 등
- GitHub repo: `claude-chat` → `hivechat` (사용자가 GitHub에서 직접 변경)
- 로컬 폴더: 사용자가 직접 `mv` 후 작업 진행
- 환경변수: `CLING_TALK_SERVER` → `HIVECHAT_SERVER`, `CLING_TALK_PROFILE` → `HIVECHAT_PROFILE`

### Fly.io 배포 구성
- 리전: 서울 근처 (nrt — 도쿄, Fly.io 아시아 리전 중 가장 가까움)
- 인스턴스: shared-1x-256MB (무료 크레딧으로 충분)
- 앱 이름: `hivechat` (hivechat.fly.dev)
- Dockerfile: Node.js 20 LTS 기반, server 패키지만 배포
- 포트: 내부 3456 → Fly.io HTTP/WS 프록시

### 클라이언트 서버 URL
- DEFAULT_SERVER_URL: `wss://hivechat.fly.dev` (배포 서버를 기본값으로)
- 환경변수 override: `HIVECHAT_SERVER` env로 커스텀 서버 주소 가능 (유지)
- 로컬 개발: `HIVECHAT_SERVER=ws://localhost:3456 npx hivechat`

### Claude's Discretion
- Dockerfile 세부 구성 (multi-stage build 등)
- fly.toml 세부 설정 (auto-scaling, health checks)
- 리네이밍 실행 순서 (코드 먼저 vs 문서 먼저)
- 기존 사용자 config 마이그레이션 여부 (v1.0이므로 불필요할 수 있음)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project definition
- `.planning/PROJECT.md` — 현재 프로젝트 상태, v1.2 마일스톤 목표
- `.planning/REQUIREMENTS.md` — Phase 11 요구사항: DEP-01, DEP-02, DEP-03

### Existing code (변경 대상)
- `packages/shared/src/constants.ts` — DEFAULT_SERVER_URL, DEFAULT_SERVER_PORT 등
- `packages/client/package.json` — name: "cling-talk", bin 경로
- `packages/client/src/config/AppConfig.ts` — conf projectName
- `packages/client/bin/cling-talk.js` — bin entry point (파일명 변경)
- `packages/client/src/ui/components/AsciiBanner.tsx` — "CLING TALK" 배너
- `packages/server/package.json` — name: "@cling-talk/server"
- `packages/shared/package.json` — name: "@cling-talk/shared"
- `package.json` — root monorepo name, scripts

### Project rules
- `CLAUDE.md` — 프로젝트명 Cling Talk 참조 (변경 대상)
- `.claude/rules/` — 프로젝트 규칙 파일들 (참조명 변경 가능)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/server/src/index.ts` — 서버 엔트리 (Fly.io 배포 대상)
- `packages/server/src/SignalingServer.ts` — WebSocket 서버 (변경 없이 배포 가능)

### Established Patterns
- npm workspaces monorepo
- ESM-only (`"type": "module"`)
- conf 라이브러리로 로컬 설정 저장

### Integration Points
- `packages/shared/src/constants.ts` — DEFAULT_SERVER_URL이 클라이언트에서 참조
- `packages/client/src/hooks/useServerConnection.ts` — 서버 URL 사용처
- `package.json` root scripts — dev, dev:server, dev:client, dev:client2

</code_context>

<specifics>
## Specific Ideas

- GitHub repo 이름 변경은 사용자가 GitHub 웹에서 직접 수행 (Settings → Rename)
- 로컬 폴더 이름 변경은 사용자가 `mv claude_chat hivechat` 직접 수행
- 이 두 작업은 코드 변경 완료 후 안내만 제공

</specifics>

<deferred>
## Deferred Ideas

- npm publish — Phase 12
- README.md — Phase 13
- 기존 cling-talk 사용자 config 마이그레이션 — v1.0 단계이므로 불필요

</deferred>

---

*Phase: 11-server-deploy*
*Context gathered: 2026-03-20*
