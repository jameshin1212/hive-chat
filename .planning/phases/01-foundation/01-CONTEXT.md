# Phase 1: Foundation - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

npx cling-talk으로 즉시 실행 가능한 CLI 쉘. TUI 레이아웃, 닉네임#태그 Identity 시스템, AI CLI 뱃지, 한글/CJK IME 조합 검증을 포함. 네트워크 연결, 채팅, 사용자 발견은 Phase 2-3에서 처리.

</domain>

<decisions>
## Implementation Decisions

### TUI 레이아웃
- 풀스크린 채팅 모드 (사이드바 없음)
- 상단: 메시지 영역 (스크롤), 하단: 고정 입력 영역
- 사용자 목록은 `/users` 슬래시 명령어로 표시
- 상태바 표시 정보: 내 ID + AI CLI 뱃지, 연결 상태, 근처 사용자 수, 현재 발견 범위
- 슬래시 명령어 체계: `/users`, `/friends`, `/chat`, `/quit`, `/settings` 등

### 메시지 포맷
- 뱃지 포함 형식: `[Claude Code] coder#3A7F: message`
- AI CLI 뱃지가 메시지 앞에 표시

### 색상 스키마
- 터미널 기본 배경색 유지
- 기본 텍스트: 초록색 (레트로 터미널 느낌)
- 사용자 테마 색상: 흰색, 노랑, 빨강, 핑크, 핫핑크, 보라, 주황
- 각 사용자에게 테마 색상 중 하나가 할당되어 닉네임/뱃지에 적용

### 한글 입력 전략
- IME 접근 방식: Claude 재량 (Ink 우선 시도 + readline fallback 등)
- 검증 범위: 전체 플로우 (조합 + 전송 + 수신 측 표시 + 닉네임 정렬)
- 이모지: 입력/표시 모두 Phase 1에서 처리
- 테스트 플랫폼: macOS 한글 IME 우선 (다른 플랫폼은 후순위)
- 성공 기준:
  - 한글 조합 중 실시간 표시 (ㅎ+ㅏ = 하 보여야 함)
  - 입력 필드 밀림/깨짐 없음
  - 커서가 입력 위치에 정확히 위치
  - 한글 + 영어 닉네임 혼재 시 UI 정렬 유지
  - Backspace 시 자모 단위 삭제 정상 동작

### 입력 UX
- 입력 중에도 새 메시지 수신 표시 (위 영역에 추가)
- Enter로 메시지 전송
- 화살표 위/아래로 입력 히스토리 재사용
- 멀티라인 입력 지원 (긴 메시지 자동 줄바꿈)

### Onboarding 흐름
- 단계별 웨이케이드: ASCII 배너 → 닉네임 입력 → AI CLI 선택 → 채팅 화면
- ASCII 아트 로고 (figlet 스타일)
- 닉네임: 영숫자만 (a-z, 0-9, 하이픈, 언더스코어, 1-16자)
- AI CLI 선택: 목록에서 화살표로 선택 (Claude Code, Codex, Gemini, Cursor)
- 재실행 시: "Welcome back, coder#3A7F" 환영 메시지 후 바로 채팅 화면
- 설정 변경: `/settings` 메뉴에서 닉네임, AI CLI 한꺼번에 변경

### npm 배포
- 패키지명: `cling-talk` (npx cling-talk)
- 프로젝트명 변경: Double Talk → **Cling Talk**

### Claude's Discretion
- IME 구현 접근 방식 (Ink 직접, readline hybrid, 커스텀 등)
- monorepo 관리 도구 선택 (npm workspaces vs turborepo)
- 최소 Node.js 버전 (20 LTS vs 22 LTS)
- Phase 1에서 서버 패키지 구조 포함 여부
- ASCII 아트 로고 디자인
- 정확한 색상 코드/밝기
- 로딩 스피너/스켈레톤 디자인

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project definition
- `.planning/PROJECT.md` — 프로젝트 비전, 핵심 가치, 제약 조건
- `.planning/REQUIREMENTS.md` — Phase 1 요구사항: IDEN-01, IDEN-02, TUI-01, TUI-02, TUI-04, DIST-01

### Research findings
- `.planning/research/STACK.md` — 기술 스택 결정 (Ink 6.x, Hyperswarm, ws, geoip-lite)
- `.planning/research/PITFALLS.md` — CJK IME 문제, npx cold start, 터미널 호환성 함정
- `.planning/research/ARCHITECTURE.md` — 컴포넌트 구조, monorepo 레이아웃, 데이터 흐름
- `.planning/research/SUMMARY.md` — 전체 리서치 종합 및 Phase별 리스크

### Project rules
- `CLAUDE.md` — 프로젝트 전용 지침 (tech stack, critical rules)
- `.claude/rules/tui-cjk-input.md` — TUI & CJK 입력 규칙
- `.claude/rules/monorepo-conventions.md` — Monorepo 컨벤션, ESM-only, dependency 정책

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- 없음 (greenfield 프로젝트, Phase 1이 첫 코드)

### Established Patterns
- 없음 — Phase 1에서 패턴 수립 예정:
  - ESM-only monorepo 구조
  - EventEmitter 기반 내부 통신
  - Ink React 컴포넌트 패턴

### Integration Points
- `.gitignore` — 이미 존재, node_modules/.env 등 포함
- `.planning/` — GSD 워크플로우 문서 디렉토리

</code_context>

<specifics>
## Specific Ideas

- 초록 레트로 텍스트 + 다양한 사용자 테마 색상 (흰색, 노랑, 빨강, 핑크, 핫핑크, 보라, 주황) — 터미널 해커 감성
- figlet 스타일 ASCII 아트 로고 — 첫 실행 시 인상적인 브랜딩
- 한글 입력 시 "밀림 현상"이 절대 없어야 함 — 사용자가 다른 터미널 채팅 도구에서 이 문제를 직접 경험함
- 풀스크린 + 슬래시 명령어 방식 — IRC 스타일, CLI 사용자에게 익숙

</specifics>

<deferred>
## Deferred Ideas

- 프로젝트명 변경에 따라 PROJECT.md, REQUIREMENTS.md, ROADMAP.md 업데이트 필요 (이 Phase context 커밋 후)

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-03-19*
