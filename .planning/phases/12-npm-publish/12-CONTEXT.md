# Phase 12: npm Publish - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

hivechat npm 패키지 publish — `npx hivechat`으로 즉시 실행 가능하게. 빌드, 패키지 구성, npm publish 실행. README는 Phase 13에서 처리.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion (전체 위임)
- npm 계정 인증 방식 (`npm login` or `npm adduser`)
- 번들링 전략 (tsdown 단일 파일 vs dependencies 유지)
- native deps 처리 (hyperswarm prebuild)
- package.json files/bin 구성 최적화
- .npmignore 또는 files 화이트리스트
- 버전: 1.2.0 (현재 마일스톤 v1.2)
- npm publish --access public
- 사용자 npm 인증은 checkpoint로 처리

</decisions>

<canonical_refs>
## Canonical References

### 기존 코드
- `packages/client/package.json` — name: hivechat, bin, files, dependencies
- `packages/client/bin/hivechat.js` — bin entry point
- `packages/shared/package.json` — @hivechat/shared (client에 번들 필요)
- `CLAUDE.md` — native dependency 금지 규칙 (hyperswarm은 prebuilt)

### Prior phase
- `.planning/phases/11-server-deploy/11-CONTEXT.md` — HiveChat 리네이밍 완료

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/client/package.json` — build script 이미 존재 (`tsdown`)
- `packages/client/bin/hivechat.js` — shebang entry 이미 존재

### Integration Points
- `packages/shared/` — client 번들에 인라인 필요 (dev에서는 .ts, npm에서는 .mjs)
- `packages/client/build` script의 `--external` 목록 (hyperswarm 관련)

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

- README.md — Phase 13
- CI/CD 자동 publish — 향후 고려

</deferred>

---

*Phase: 12-npm-publish*
*Context gathered: 2026-03-20*
