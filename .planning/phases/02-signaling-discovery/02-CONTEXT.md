# Phase 2: Signaling & Discovery - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

WebSocket 신호 서버 구축 + IP geolocation 기반 근처 사용자 발견 + 온라인/오프라인 presence 관리. Phase 1의 클라이언트 TUI에 서버 연결을 통합. 실제 채팅 메시지 교환은 Phase 3에서 처리.

</domain>

<decisions>
## Implementation Decisions

### 서버 배포/실행
- Phase 2는 로컬 개발 환경만 (배포는 모든 Phase 완료 후 Fly.io)
- `npm run dev`로 서버+클라이언트 동시 기동 (단일 명령어)
- 채팅 테스트 시 다른 터미널에서 클라이언트 추가 실행
- 서버 주소: 기본값 `ws://localhost:3456` + 환경변수(`CLING_TALK_SERVER`)로 변경 가능

### 근처 발견 UX
- `/users` = 근처 접속자 목록 (IP geolocation 반경 내 모든 접속자)
- `/friends` = 내가 추가한 친구 목록 (Phase 4에서 구현)
- `/users` 실행 시: 테이블 형식 표시 (nick#tag | [AI CLI] | 거리 | 상태)
- 사용자 선택: `/users` → Enter → 화살표 위/아래로 선택 → Enter로 대화 시작
- 목록 정렬: 거리순 (가까운 사용자가 위)
- 빈 상태: "No users nearby. Try expanding radius" 메시지 + 범위 확대 제안

### 범위 전환
- 상태바에서 단축키로 범위 순환 (1→3→5→10→1km)
- 상태바에 현재 범위 표시

### Presence 동작
- 상태 표시: [online] / [offline] 텍스트 태그
- heartbeat 간격: 30초
- 오프라인 감지: 1분간 응답 없으면 offline 처리
- 상태바에 내 연결 상태: connected / reconnecting / offline

### 서버 연결 UX
- 연결/끊김/재연결 시: 상태바 텍스트 변경 + 채팅 영역에 시스템 메시지
- 재연결: exponential backoff + jitter (500ms → 30s cap)

### Claude's Discretion
- WebSocket 서버 포트 번호 (기본 3456 제안)
- geoip-lite DB 업데이트 전략
- 서버 내부 데이터 구조 (인메모리 사용자 맵)
- heartbeat ping/pong 구현 세부사항
- 범위 전환 단축키 선택

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project definition
- `.planning/PROJECT.md` — 프로젝트 비전, 핵심 가치, 네트워크 구조
- `.planning/REQUIREMENTS.md` — Phase 2 요구사항: DISC-01, DISC-02, DISC-03, IDEN-03

### Research findings
- `.planning/research/STACK.md` — ws 8.x, geoip-lite, haversine 기술 스택
- `.planning/research/ARCHITECTURE.md` — 시그널링 서버 구조, 데이터 플로우, 컴포넌트 경계
- `.planning/research/PITFALLS.md` — IP geolocation 정확도 (40-75%), WebSocket 연결 끊김, heartbeat 필수

### Prior phase
- `.planning/phases/01-foundation/01-CONTEXT.md` — TUI 결정사항 (풀스크린, 슬래시 명령, 상태바)
- `packages/shared/src/types.ts` — Identity, AiCli, SlashCommand 타입 정의
- `packages/shared/src/schemas.ts` — zod 스키마 (확장 대상)
- `packages/client/src/commands/CommandParser.ts` — 기존 명령어 파서 (확장 대상)
- `packages/client/src/ui/components/StatusBar.tsx` — 상태바 컴포넌트 (연결 상태 표시 추가)

### Project rules
- `CLAUDE.md` — 프로젝트 전용 지침 (P2P 네트워킹 규칙)
- `.claude/rules/p2p-networking.md` — WebSocket 안정성, IP geolocation 서버사이드, heartbeat 규칙
- `.claude/rules/protocol-design.md` — Protocol-first 원칙, zod schema, 메시지 포맷

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/shared/src/types.ts` — Identity, ParsedInput 타입. 서버 프로토콜 메시지 타입 추가 대상
- `packages/shared/src/schemas.ts` — zod 스키마. 서버 메시지 검증 스키마 추가 대상
- `packages/shared/src/constants.ts` — AI_CLI_OPTIONS, USER_COLORS. 서버 상수 추가 대상
- `packages/client/src/commands/CommandParser.ts` — COMMANDS 객체에 /radius, /connect 등 추가
- `packages/client/src/ui/components/StatusBar.tsx` — 연결 상태 + 범위 표시 추가

### Established Patterns
- ESM-only monorepo (npm workspaces, `"type": "module"`)
- shared 패키지의 zod 스키마로 타입 안전성
- Ink React 컴포넌트 (Box, Text, useInput)
- useRef + useState 패턴 (IME 대응)

### Integration Points
- `packages/client/src/ui/App.tsx` — 서버 연결 상태를 ChatScreen에 전달
- `packages/client/src/ui/screens/ChatScreen.tsx` — 사용자 목록 오버레이 추가
- `packages/client/src/index.tsx` — 서버 연결 초기화

</code_context>

<specifics>
## Specific Ideas

- `/users` → 테이블로 근처 사용자 표시 → 화살표로 선택 → 대화 시작 (인터랙티브 선택)
- 상태바에서 단축키로 범위 순환 (1→3→5→10→1)
- 연결 끊김 시 채팅 영역에 시스템 메시지 + 상태바 변경 (이중 피드백)

</specifics>

<deferred>
## Deferred Ideas

- 서버 배포 (Fly.io) — 모든 Phase 완료 후
- VPN 감지 및 경고 — 서버 구현 후 정확도 확인 후 판단

</deferred>

---

*Phase: 02-signaling-discovery*
*Context gathered: 2026-03-19*
