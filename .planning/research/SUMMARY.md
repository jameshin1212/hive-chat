# Project Research Summary

**Project:** HiveChat v1.4 UI/UX Polish
**Domain:** CLI TUI onboarding, welcome screen, responsive terminal layout
**Researched:** 2026-03-21
**Confidence:** HIGH

## Executive Summary

HiveChat v1.4는 기능 완성도 높은 P2P 채팅 CLI 위에 "professional CLI tool" 수준의 UX polish를 더하는 milestone이다. 연구 결과, 새로운 dependency 없이 현재 설치된 stack(Ink 6, figlet, chalk, @inkjs/ui)만으로 모든 목표 기능을 구현할 수 있음이 확인되었다. 핵심 변경은 4가지다: (1) `App.tsx`의 setTimeout 기반 WelcomeBack splash 제거, (2) ChatScreen에 lobby 상태용 WelcomeSection 통합, (3) OnboardingScreen UI 개선(step indicator, box border), (4) `useTerminalSize` hook으로 반응형 breakpoint 구현.

가장 큰 리스크는 기술적 신규성이 아닌 기존 구현의 취약점을 건드리는 것이다. `AiCliSelector`의 `useInput`이 `isActive` guard 없이 동작하여 새 interactive component 추가 시 키 이벤트 충돌이 발생한다. IMETextInput의 한글 조합 메커니즘이 부모 re-render에 민감하여 UI 변경 후 CJK 입력 regression이 발생할 수 있다. 또한 `ChatScreen.tsx`의 `messageAreaHeight = rows - 4 - overlayHeight` magic number가 WelcomeSection 추가 시 메시지 영역을 극도로 잠식한다.

권장 접근법은 ARCHITECTURE.md의 4단계 build order를 따르는 것이다: useTerminalSize hook 먼저 작성하고, OnboardingScreen UI 개선(독립적), WelcomeSection 통합(핵심), 마지막으로 StatusBar responsive 적용 순으로 진행한다. 각 단계에서 한글 IME 테스트를 의무적으로 수행하고, useInput 충돌 방어를 Phase 1에서 선제적으로 처리하면 위험을 충분히 통제할 수 있다.

## Key Findings

### Recommended Stack

v1.4에 필요한 모든 기능은 기존 dependency만으로 구현 가능하다. 새 npm 패키지 추가는 불필요하며, 번들 크기 1MB 미만 목표와 native dependency 금지 제약을 자연스럽게 지킨다. `@inkjs/ui`(Spinner, Badge, StatusMessage)가 이미 설치되어 있으나 Ink 6 호환성은 런타임 검증이 필요하다.

**핵심 기술:**
- `figlet@1.11.0`: ASCII 배너 — 이미 설치, `textSync` 동기 호출로 즉시 표시
- `useStdout()` (Ink 내장): 터미널 크기 감지 — 별도 패키지 불필요, resize 시 re-render 트리거
- `chalk@5.x`: 색상/스타일 — Ink 6과 완벽 호환, `hex()` 조합으로 풍부한 표현
- `tsdown define`: 빌드 타임 버전 주입 — 런타임 파일 읽기 없이 `__APP_VERSION__` 상수 생성
- `@inkjs/ui@2.0.0`: Spinner, Badge 컴포넌트 — Ink 6 호환성 검증 필요 (Ink 5 대상 출시)

**제외 결정:**
- `gradient-string`: 불필요한 dependency chain, chalk.hex()로 충분
- `ink-use-stdout-dimensions`: custom hook으로 직접 구현이 더 적합
- `cfonts`, `boxen`, `terminal-link`: figlet, Ink `<Box>`, ANSI escape로 대체 가능

### Expected Features

**Must have (table stakes) — v1.4 P1:**
- 동적 버전 표시 — 하드코딩 `v0.1.0` 제거, package.json 버전을 빌드 타임 주입
- Welcome section (version + profile + tips) — lobby 빈 화면을 정보성 UI로 교체
- 반응형 breakpoint (compact/normal/wide) — 터미널 폭에 따른 레이아웃 적응
- 최소 터미널 크기 경고 — CLAUDE.md 명시 60 컬럼 미만 guard
- 적응형 ASCII 배너 — 폭에 따라 figlet/간소화 배너/plain text 3단계 분기
- 온보딩 step indicator — "Step 1/2" 또는 progress dots로 진행 상태 표시

**Should have (differentiator) — v1.4 P2:**
- 온보딩 box border 스타일 — `<Box borderStyle="round">`로 입력 영역 시각화
- 컨텍스트별 tips 순환 — 세션마다 랜덤 tip, 기능 발견 촉진
- 첫 인터랙션 시 welcome dismiss — 메시지 전송/수신 시 welcome section 자동 숨김
- 애니메이션 연결 spinner — connecting/reconnecting 상태에 시각적 피드백

**Defer (v1.5+):**
- 반응형 사이드 패널 — HIGH complexity, 가로 레이아웃 아키텍처 전면 재작업 필요
- 온보딩 전환 애니메이션 — 2-step flow에서 ROI 낮음
- 테마 커스터마이징 — v1.4 scope 외

### Architecture Approach

WelcomeSection은 별도 Screen이 아닌 ChatScreen 내부에서 `isLobby` 조건으로 MessageArea 영역을 대체하는 패턴을 사용한다. 이 방식은 ChatScreen의 기존 connection hooks(identity, status, users, friends) 데이터를 자연스럽게 재사용하고, lobby→chat 전환 시 unmount/remount 없이 매끄러운 전환이 가능하다. 반응형 레이아웃은 `useTerminalSize` custom hook이 `stdout.on('resize')` 이벤트를 구독하여 `layout: 'compact' | 'normal' | 'wide'` enum을 반환하며, 각 컴포넌트는 layout prop만 참조한다.

**주요 컴포넌트:**
1. `useTerminalSize` (NEW hook) — resize 감지 + 3단계 breakpoint 분류, 모든 responsive 컴포넌트의 의존성
2. `WelcomeSection` (NEW) — lobby 상태 메인 UI, ProfileCard + TipsPanel 하위 컴포넌트 포함
3. `StepIndicator` (NEW) — 재사용 가능한 multi-step 진행 표시, 향후 settings wizard에도 재사용 가능
4. `OnboardingScreen` (MODIFY) — step indicator + box border 적용, Props/App.tsx 변경 없음
5. `ChatScreen` (MODIFY) — useTerminalSize 통합, WelcomeSection 조건부 렌더링, magic number 리팩토링
6. `StatusBar` (MODIFY) — compact mode(layout='compact' 시 단축 표시)

### Critical Pitfalls

1. **`AiCliSelector` useInput isActive 누락** — 현재 `isActive` guard 없이 전역 키 이벤트 수신. 새 interactive component 추가 전 모든 useInput에 `{ isActive: boolean }` 옵션 반드시 추가. 미처리 시 Enter/Arrow 키 중복 처리로 온보딩 step 건너뜀.

2. **CJK/IME re-render regression** — IMETextInput을 `React.memo`로 보호, 온보딩에 timer/animation 추가 시 IMETextInput까지 re-render가 전파되지 않도록 state 분리. 모든 UI 변경 후 `ㅎ+ㅏ+ㄴ=한` 조합 테스트 필수.

3. **ASCII 배너가 좁은 터미널에서 레이아웃 파괴** — figlet Standard 폰트 출력이 약 75 컬럼. 터미널 폭 감지 후 `columns >= 75` → figlet, `columns >= 50` → 간소화, `< 50` → plain text 3단계 분기.

4. **ChatScreen height magic number가 WelcomeSection 공간 잠식** — `rows - 4 - overlayHeight` 계산이 WelcomeSection 추가 시 메시지 영역 최소화. `rows < 30` 간소화, `rows < 20` 완전 숨김, 메시지 영역 최소 5줄 보장으로 방어.

5. **setTimeout in render (App.tsx WelcomeBack)** — `useEffect` 내부 + cleanup `clearTimeout` 패턴으로 교체 또는 WelcomeSection 통합으로 splash 자체 제거.

## Implications for Roadmap

ARCHITECTURE.md 분석 기반 4단계 구현 순서를 권장한다. Phase 1이 나머지 모든 phase의 의존성이므로 반드시 먼저 완료해야 한다.

### Phase 1: 공유 인프라 (useTerminalSize + useInput 방어)

**Rationale:** 나머지 3개 phase 모두 breakpoint enum과 resize hook에 의존. useInput isActive 미처리 시 Phase 2 온보딩 작업이 즉시 키 충돌 버그를 일으킨다.
**Delivers:** `useTerminalSize` hook, breakpoint 상수(COMPACT_WIDTH=80/WIDE_WIDTH=120), `AiCliSelector` 등 모든 useInput에 isActive 추가
**Addresses:** 반응형 breakpoint (FEATURES.md P1)
**Avoids:** Pitfall 5 (resize 미처리), Pitfall 2 (useInput 충돌) — 선제 처리
**Research flag:** 표준 Node.js resize event 패턴, 추가 연구 불필요

### Phase 2: OnboardingScreen UI 개선

**Rationale:** ChatScreen 변경과 독립적. Phase 1 isActive fix 이후 안전하게 진행 가능. WelcomeSection보다 단순하여 팀이 Ink box/layout 패턴을 익히는 학습 단계로 적합.
**Delivers:** step indicator ("Step 1/2"), `<Box borderStyle="round">` 입력 영역, welcome step 제거 또는 축소, 적응형 ASCII 배너
**Uses:** Ink `<Box borderStyle>`, figlet 폭 기반 3단계 분기
**Implements:** `StepIndicator` 컴포넌트 (재사용 가능)
**Avoids:** Pitfall 3 (CJK regression — React.memo 적용), Pitfall 4 (배너 overflow), Pitfall 9 (step 전환 flicker — step을 state-only로 구현)
**Research flag:** 표준 Ink 패턴, 추가 연구 불필요

### Phase 3: WelcomeSection + App.tsx 정리 (핵심)

**Rationale:** 가장 높은 사용자 가치, 가장 큰 변경. Phase 1의 useTerminalSize와 Phase 2의 StepIndicator가 준비된 후 진행. WelcomeBack splash 제거와 WelcomeSection 추가는 atomic하게 이루어져야 함.
**Delivers:** WelcomeSection(version/profile/tips), ProfileCard, TipsPanel, App.tsx WelcomeBack splash 제거, 동적 버전 표시(tsdown define)
**Uses:** tsdown define으로 __APP_VERSION__ 주입, ChatScreen 조건부 렌더링, 기존 connection hooks 데이터 재사용
**Implements:** Conditional Region Rendering 패턴, Layout Breakpoints 패턴
**Avoids:** Pitfall 1 (setTimeout → useEffect cleanup), Pitfall 6 (높이 잠식 — rows 기반 adaptive + 최소 5줄 보장), Pitfall 11 (버전 하드코딩)
**Research flag:** overlayHeight 계산 magic number 리팩토링 — plan-phase에서 ChatScreen.tsx:84 전체 경로 추적 필요

### Phase 4: StatusBar Responsive + 전체 통합 마무리

**Rationale:** Phase 3 이후 layout prop을 전체 컴포넌트에 확산. 통합 테스트(실제 터미널 크기 변경, 한글 IME, tmux 환경)가 핵심.
**Delivers:** StatusBar compact mode, overlayHeight 계산 동적화(magic number 제거), 최소 터미널 크기 warning, Unicode box-drawing fallback, color depth 감지
**Uses:** layout prop from useTerminalSize, is-unicode-supported (선택적), supports-color
**Avoids:** Pitfall 7 (Unicode 미감지), Pitfall 8 (사이드 패널 폭 계산), Pitfall 10 (color depth)
**Research flag:** 표준 패턴, 추가 연구 불필요. 단 tmux/screen 환경 테스트 권장.

### Phase Ordering Rationale

- **Phase 1 선행 필수:** useTerminalSize가 공통 의존성, useInput isActive fix가 Phase 2 버그를 예방
- **Phase 2 독립성:** OnboardingScreen이 ChatScreen과 분리된 코드 경로 — Phase 1 완료 후 안전
- **Phase 3이 핵심:** 사용자 가치 최대, 변경 범위 최대. WelcomeBack 제거와 WelcomeSection 추가를 같은 PR에서 처리
- **Phase 4 마무리:** Phase 3의 layout prop이 전파된 후 자연스럽게 처리, 통합 QA 단계

### Research Flags

추가 연구가 필요한 phase:
- **Phase 3:** `ChatScreen.tsx:84`의 `overlayHeight` 계산 로직이 여러 overlay type(UserList, FriendList, Settings, UserDetail)에 따라 복잡. plan-phase에서 전체 경로 추적 후 동적 계산 방식 설계 필요.

표준 패턴으로 추가 연구 불필요:
- **Phase 1:** useStdout + Node.js resize event listener — 직접 확인한 패턴
- **Phase 2:** Ink Box borderStyle, figlet 폭 분기 — 직접적인 API 사용
- **Phase 4:** supports-color, is-unicode-supported — 단순 감지 패키지, 프로젝트 CLAUDE.md에 이미 명시

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | 기존 설치 패키지 직접 확인. 새 패키지 없음. @inkjs/ui Ink 6 호환성만 런타임 검증 필요. |
| Features | HIGH | 기존 코드베이스 분석 + Claude Code/gh CLI/lazygit 경쟁 분석 기반. 범위 명확히 정의됨. |
| Architecture | HIGH | ChatScreen.tsx, App.tsx, OnboardingScreen.tsx 직접 분석. Data flow 검증됨. 취약점도 식별됨. |
| Pitfalls | HIGH | 실제 코드 취약점 식별(AiCliSelector isActive 누락, magic number) + Ink 공식 이슈 + React IME 이슈 참조. |

**Overall confidence:** HIGH

### Gaps to Address

- **@inkjs/ui Ink 6 호환성:** `@inkjs/ui@2.0.0`이 Ink 5 대상으로 출시됨. Phase 3 또는 Phase 4에서 Spinner 사용 전 실제 import 테스트 필요. 비호환 시 직접 구현으로 대체(복잡도 낮음).
- **overlayHeight 전체 계산 경로:** ChatScreen의 height 계산이 overlay type별로 조건이 복잡. Phase 3 plan-phase에서 실제 코드 추적 후 동적 계산 방식 확정 필요.
- **tmux/screen Unicode 환경:** `TERM=screen` 환경에서 is-unicode-supported 반환값 불확실. Phase 4 실행 전 확인 권장.

## Sources

### Primary (HIGH confidence)

- Ink GitHub (github.com/vadimdemedes/ink) — useStdout, resize event, Yoga layout, useInput isActive
- 기존 코드베이스 직접 분석 — `ChatScreen.tsx`, `App.tsx`, `OnboardingScreen.tsx`, `AiCliSelector.tsx`, `IMETextInput.tsx`, `AsciiBanner.tsx`
- `packages/shared/src/constants.ts` — MIN_TERMINAL_WIDTH=60 이미 정의 확인
- figlet npm (npmjs.com/package/figlet) — v1.11.0 최신, 300+ 폰트
- Ink GitHub issue #153 (github.com/vadimdemedes/ink/issues/153) — resize handling 동작

### Secondary (MEDIUM confidence)

- Ink TUI expandable layouts (combray.prose.sh/2025-11-28-ink-tui-expandable-layout) — fixed footer patterns, layout metrics
- React IME composition events issue #8683 (github.com/facebook/react/issues/8683) — IME re-render 민감도
- Claude Code Korean IME issue #22732 (github.com/anthropics/claude-code/issues/22732) — CJK input patterns in Ink
- UX patterns for CLI tools (lucasfcosta.com/blog/ux-patterns-cli-tools) — onboarding, progressive disclosure
- Ink v3 hooks and focus management (developerlife.com/2021/11/25/ink-v3-advanced-ui-components/) — useInput isActive 패턴

### Tertiary (LOW confidence)

- @inkjs/ui npm (npmjs.com/package/@inkjs/ui) — v2.0.0, Ink 6 호환성 미확인 (런타임 테스트 필요)
- ink-use-stdout-dimensions (npmjs.com/package/ink-use-stdout-dimensions) — 제외 결정 참조용

---
*Research completed: 2026-03-21*
*Ready for roadmap: yes*
