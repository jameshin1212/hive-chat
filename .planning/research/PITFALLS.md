# Domain Pitfalls

**Domain:** UI/UX Polish for Ink 6 TUI -- onboarding, welcome screen, responsive layout
**Project:** HiveChat v1.4
**Researched:** 2026-03-21
**Confidence:** HIGH (codebase 직접 분석 + Ink 공식 문서 + 커뮤니티 이슈 기반)

---

## Critical Pitfalls

### Pitfall 1: setTimeout in App.tsx Welcome Screen -- setState on Unmounted Component

**What goes wrong:** 현재 `App.tsx:17`에서 `setTimeout(() => setShowWelcomeBack(false), 1500)`이 cleanup 없이 사용됨. 사용자가 빠르게 Ctrl+C로 종료하면 unmounted component에 setState가 호출되어 React warning 또는 예측 불가 동작 발생.
**Why it happens:** setTimeout이 component lifecycle과 분리되어 동작. Ink에서 `process.exit()` 호출 시 React unmount와 timer cancel이 동기화되지 않음.
**Consequences:** React "setState on unmounted component" warning. 극단적 케이스에서 exit 지연 또는 orphaned process.
**Prevention:**
- `useEffect` 내에서 setTimeout 호출하고 cleanup에서 `clearTimeout` 반환
- 패턴: `useEffect(() => { const t = setTimeout(...); return () => clearTimeout(t); }, []);`
- welcome screen을 별도 component로 분리하여 lifecycle 관리 명확화
**Detection:** Ctrl+C 빠르게 누를 때 console warning 확인

---

### Pitfall 2: useInput 충돌 -- 온보딩/웰컴/채팅 화면 간 Input Focus 경합

**What goes wrong:** Ink의 `useInput`은 모든 rendered component에서 동시에 키 이벤트를 수신. 온보딩 화면에 새 interactive component(예: step indicator, 추가 selector)를 추가하면 기존 `AiCliSelector`의 useInput과 충돌하여 Enter/Arrow 키가 중복 처리됨.
**Why it happens:** Ink의 useInput은 글로벌 stdin listener. `isActive` 옵션을 명시적으로 전달하지 않으면 모든 component가 동일 키 이벤트를 받음. **현재 `AiCliSelector.tsx`는 `isActive` 없이 useInput 사용 중** -- 이것이 v1.4에서 새 interactive component 추가 시 반드시 충돌하는 지뢰.
**Consequences:** 화살표 키가 여러 component를 동시 조작. Enter 키 중복 submit. 온보딩 step 건너뛰기.
**Prevention:**
- 모든 useInput 호출에 `{ isActive: boolean }` 옵션 필수 전달
- `AiCliSelector`에 `isActive` prop 추가: `useInput(handler, { isActive })`
- 새로운 interactive component도 반드시 `isActive` guard 적용
- 화면 전환 시 이전 화면의 input handler가 확실히 비활성화되는지 테스트
**Detection:** 온보딩 flow에서 Enter 한 번에 여러 step이 동시 진행되는지 확인

---

### Pitfall 3: CJK/IME 입력 Regression -- 온보딩 닉네임 필드에서 한글 조합 깨짐

**What goes wrong:** 온보딩 화면 UI 변경(애니메이션, 레이아웃 변경, 새 component 추가) 후 `IMETextInput`의 한글 조합이 깨짐. 특히 component가 re-render되면 IME 조합 중인 문자가 초기화됨.
**Why it happens:**
1. 부모 component의 불필요한 re-render가 IMETextInput까지 전파되어 내부 state(textRef, cursorPosRef) 리셋
2. 온보딩에 animation/timer 추가 시 frequent re-render 유발
3. Ink의 raw mode에서 IME composition event가 byte 단위로 처리되므로 re-render 타이밍에 민감
4. `IMETextInput`이 `textRef`로 React batching 문제를 우회하는 정교한 구현인데, 외부에서 forced re-render 시 이 메커니즘이 깨질 수 있음
**Consequences:** 한글 조합 중 "ㅎㅏㄴ" 이 "한"으로 합쳐지지 않고 개별 자모로 표시. 닉네임에 깨진 문자 저장.
**Prevention:**
- IMETextInput을 `React.memo`로 감싸서 불필요한 re-render 차단
- 온보딩 화면에서 timer/animation이 IMETextInput 포함 component를 re-render하지 않도록 state 분리
- 모든 UI 변경 후 한글 조합 테스트 필수: ㅎ+ㅏ+ㄴ=한, ㄱ+ㅏ+ㄹ+ㄱ+ㅗ+ㅈ+ㅣ=갈곳이
- 테스트 자동화: IMETextInput.test.tsx에 re-render 중 조합 유지 테스트 추가
**Detection:** 닉네임 입력 필드에서 한글 타이핑 시 조합 문자가 보이지 않거나 깨지는 현상

---

### Pitfall 4: ASCII Banner가 좁은 터미널에서 레이아웃 파괴

**What goes wrong:** `figlet.textSync('HIVECHAT', { font: 'Standard' })` 결과물이 약 75 컬럼 폭. 60 컬럼 미만 터미널에서 줄바꿈이 발생하여 배너가 깨지고, Ink의 layout engine이 예상치 못한 높이를 계산하여 하단 UI가 밀려남.
**Why it happens:** figlet은 터미널 폭을 고려하지 않고 고정 폭 텍스트 생성. Ink의 Box/Text는 텍스트가 overflow하면 terminal의 line wrapping에 의존하는데, 이 wrapping이 Ink의 layout 계산과 불일치.
**Consequences:** 배너 줄바꿈으로 6줄 -> 12줄 이상으로 확장. 온보딩/웰컴 화면에서 실제 input 영역이 화면 밖으로 밀림. 극단적 케이스에서 입력 불가.
**Prevention:**
- 터미널 폭 감지 후 조건부 배너 선택: `columns >= 75` figlet, `columns >= 50` 간소화 배너, `< 50` 단순 텍스트
- 현재 `AsciiBanner.tsx`의 fallback `=== HIVECHAT ===`은 catch 블록에만 존재 -- width 기반 분기로 확장 필요
- figlet에 `width` 옵션 전달하여 출력 폭 제한 가능
- 웰컴 섹션의 모든 decorative element에도 동일 패턴 적용
**Detection:** `COLUMNS=50 npx hivechat`으로 실행하여 배너가 깨지는지 확인

---

## Moderate Pitfalls

### Pitfall 5: 반응형 레이아웃에서 resize 이벤트 처리 누락

**What goes wrong:** `useStdout().stdout.columns/rows`는 render 시점의 현재값을 반환하지만, 값 변경이 자동으로 re-render를 trigger하지 않음. 터미널 크기 변경 후 레이아웃이 갱신되지 않아 overflow 또는 빈 공간 발생.
**Why it happens:** Ink의 `useStdout`은 stdout 객체 참조를 제공할 뿐 resize event listener를 자동 등록하지 않음. 현재 `ChatScreen.tsx:43-44`에서 `stdout?.columns`, `stdout?.rows`를 직접 읽지만 이는 최초 render 시점의 값만 사용됨.
**Prevention:**
- `stdout.on('resize', handler)` 이벤트 리스너로 state update trigger
- custom hook `useTerminalSize()` 작성하여 resize -> re-render 파이프라인 구축
- cleanup에서 listener 제거 필수
- Ink issue #153 참고: 터미널 높이가 출력보다 작아지면 상단이 잘리는 문제 있음 -- fullscreen mode 사용 시 주의
**Detection:** 터미널 창 크기를 변경한 후 UI가 이전 크기로 유지되는지 확인

---

### Pitfall 6: 웰컴 섹션 높이가 메시지 영역을 잠식

**What goes wrong:** 웰컴 섹션(버전, ASCII 아트, 프로필, Tips)이 10-15줄 차지하여 `messageAreaHeight = Math.max(1, rows - 4 - overlayHeight)` (ChatScreen.tsx:84)에서 메시지 표시 영역이 극도로 줄어듦. 24줄 터미널에서 메시지 2-3줄만 표시 가능.
**Why it happens:** ChatScreen의 높이 계산이 현재 overlay만 고려하고 웰컴 섹션의 동적 높이를 반영하지 않음. `rows - 4` magic number가 고정 구조(separator 2줄 + StatusBar 1줄 + input 1줄)만 가정.
**Consequences:** 사용자가 채팅 시작 후에도 웰컴 섹션이 공간을 차지하여 메시지가 거의 보이지 않음.
**Prevention:**
- 웰컴 섹션은 채팅 시작 전에만 표시, 첫 메시지 수신/발신 시 자동 축소 또는 숨김
- 터미널 높이 기반 adaptive: `rows < 30` 간소화, `rows < 20` 완전 숨김
- 메시지 영역 최소 높이 보장: `Math.max(5, calculatedHeight)`
- magic number 4를 동적 계산으로 리팩토링
**Detection:** `LINES=20 npx hivechat`으로 실행하여 메시지 영역이 최소 5줄 이상 확보되는지 확인

---

### Pitfall 7: Box-drawing 문자와 Unicode 지원 미확인

**What goes wrong:** 웰컴 섹션에 box-drawing 문자(│, ─, ═, rounded corners ╭╮╰╯)를 사용하면 Unicode 미지원 터미널에서 깨진 문자 표시. 특히 Windows의 일부 legacy terminal, tmux의 `TERM=screen` 설정.
**Why it happens:** 프로젝트 rule에 `is-unicode-supported`로 확인 후 ASCII fallback이 명시되어 있지만, 실제 구현에서 이를 누락하기 쉬움. 현재 코드에서 `TransitionLine.tsx`의 `═` 문자, `ChatScreen.tsx:301`의 `─` 문자가 이미 Unicode에 의존.
**Prevention:**
- `is-unicode-supported` 패키지로 런타임 감지
- Unicode 불가 시 ASCII fallback: `─` -> `-`, `═` -> `=`, `│` -> `|`, corners -> `+`
- 웰컴 섹션의 새 border/separator 추가 시 반드시 fallback 쌍 정의
- theme에 `chars.unicode` / `chars.ascii` 분기 추가
**Detection:** `TERM=dumb npx hivechat` 또는 `TERM=screen npx hivechat`

---

### Pitfall 8: 사이드 패널(Tips/Activity) 추가 시 가로 레이아웃과 CJK 폭 계산 불일치

**What goes wrong:** 넓은 터미널에서 사이드 패널을 `flexDirection="row"`로 추가하면, `string-width` 기반 폭 계산이 Ink의 Yoga layout engine과 불일치. 특히 CJK 문자(2-column), 이모지(2-column)가 포함된 콘텐츠에서 overflow 또는 잘림 발생.
**Why it happens:** Ink의 Yoga layout은 character 단위가 아닌 Yoga 고유 측정 방식 사용. `width` prop을 percentage(`"50%"`)로 지정하면 CJK 문자와의 정렬이 틀어짐. 현재 `IMETextInput`의 `availableWidth` 계산(line 153)이 columns 기준인데, 사이드 패널 추가 시 이 값이 전체 터미널 폭이 아닌 메인 패널 폭이어야 함.
**Prevention:**
- 사이드 패널 폭을 절대값(숫자)으로 지정: `<Box width={30}>` (percentage 사용 금지)
- 메인 영역은 `flexGrow={1}`로 나머지 공간 차지
- `IMETextInput`에 `availableWidth`를 부모로부터 prop으로 전달하거나, 자체적으로 부모 Box 폭 감지
- 사이드 패널 내 텍스트를 `string-width`로 truncate 처리
**Detection:** 120+ 컬럼 터미널에서 한글 닉네임 + 이모지 포함 Tips 표시 후 레이아웃 정렬 확인

---

### Pitfall 9: 온보딩 step 전환 시 깜빡임(flicker)

**What goes wrong:** 온보딩 step 변경(welcome -> nickname -> ai-cli) 시 전체 화면이 깜빡임. 특히 AsciiBanner가 매 step마다 re-render되면서 figlet 텍스트가 한 프레임 사라졌다 나타남.
**Why it happens:** Ink의 rendering은 stdout에 ANSI escape sequence로 이전 출력을 지우고 새 출력을 그림. Step 전환 시 component tree가 변경되면 전체 화면 다시 그리기 발생. SSH/tmux 환경에서 latency가 더해져 flicker가 심화.
**Consequences:** 시각적으로 불안정한 전환. 전문적이지 않은 인상.
**Prevention:**
- AsciiBanner를 step 간 공유 component로 유지 (현재 OnboardingScreen이 이 패턴을 따름 -- step별 return 각각에 `<AsciiBanner />` 포함)
- step 전환을 단일 component 내 state 변경으로 구현 (현재 패턴 유지)
- 절대로 step별로 별도 Screen component를 mount/unmount 하지 말 것
- content 영역만 변경하고 layout shell(banner + outer box)은 고정
- 온보딩 리팩토링 시 `<Box flexDirection="column">` + `<AsciiBanner />` 를 외부에 한 번만 배치하고 내부 content만 조건부 렌더링
**Detection:** tmux 내에서 온보딩 진행하며 화면 깜빡임 확인

---

## Minor Pitfalls

### Pitfall 10: color depth 미감지로 배경색/강조색 표시 실패

**What goes wrong:** 웰컴 섹션에 배경색, gradient, 또는 256-color를 사용하면 true-color 미지원 터미널에서 색상이 깨지거나 읽기 어려운 조합으로 표시.
**Prevention:**
- `supports-color` 패키지로 color depth 감지 (이미 프로젝트 rule에 명시)
- 16-color fallback 우선, 256-color는 enhancement
- 배경색 사용 최소화 -- 전경색 + bold/dim으로 시각적 구분

---

### Pitfall 11: 웰컴 화면의 하드코딩된 버전 문자열

**What goes wrong:** 현재 `ChatScreen.tsx:116`에 `'HiveChat v0.1.0'`이 하드코딩됨. 웰컴 섹션에 버전을 표시하면 실제 package.json 버전과 불일치. 배포 후 버전이 업데이트되어도 표시는 v0.1.0 고정.
**Prevention:**
- `package.json`에서 version을 빌드 타임에 주입 (tsdown define 또는 import assertion)
- 절대 문자열 리터럴로 버전 하드코딩 금지
- 패턴: `const VERSION = process.env.npm_package_version ?? 'dev';` 또는 빌드 시 `define: { __VERSION__: JSON.stringify(pkg.version) }`

---

### Pitfall 12: Tips 영역의 l10n/i18n 누락

**What goes wrong:** Tips 텍스트를 영어로 하드코딩하면 프로젝트 global rule 위반 (사용자 대면 문자열 l10n/i18n 처리 필수).
**Prevention:**
- Tips 문자열을 상수 배열로 분리하여 향후 i18n 대응 가능하게
- 최소한 파일 분리: `ui/constants/tips.ts` 등
- 현재 `ChatScreen.tsx:117`의 Tips 문자열도 동일하게 분리 필요

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| 온보딩 화면 UI 개선 | Pitfall 2 (useInput 충돌), Pitfall 3 (CJK regression), Pitfall 9 (flicker) | 모든 useInput에 isActive 추가, 변경 후 한글 테스트, step 전환을 state-only로 구현 |
| 웰컴 섹션 추가 | Pitfall 4 (ASCII banner overflow), Pitfall 6 (높이 잠식), Pitfall 11 (버전 하드코딩) | 터미널 폭 기반 배너 분기, 웰컴 섹션 동적 높이 + 최소 메시지 영역 보장, 버전 자동 주입 |
| 반응형 레이아웃 | Pitfall 5 (resize 미처리), Pitfall 8 (사이드 패널 폭), Pitfall 7 (Unicode fallback) | useTerminalSize hook, 절대값 width, is-unicode-supported 감지 |
| 전체 통합 | Pitfall 1 (setTimeout cleanup) | App.tsx의 setTimeout을 useEffect 기반으로 리팩토링 |

---

## Integration Risk: ChatScreen 높이 계산 Magic Number

현재 `ChatScreen.tsx:84`의 `messageAreaHeight = Math.max(1, rows - 4 - overlayHeight)` 계산은 고정된 UI 구조(separator 2줄 + StatusBar 1줄 + input 1줄 = 4줄)를 가정. 웰컴 섹션이나 반응형 레이아웃 변경 시 이 magic number 4를 반드시 업데이트해야 하며, 동적으로 계산하는 방식으로 리팩토링하는 것을 권장.

구체적으로:
- 웰컴 섹션 높이가 동적이면 `overlayHeight` 계산에 포함해야 함
- 사이드 패널 추가 시 세로 높이는 유지되지만 가로 공간 분할 필요
- `rows` 기반 계산이 여러 곳에 산재하면 유지보수 어려움 -- 단일 layout config 객체로 중앙화

---

## Sources

- [Ink GitHub - resize events issue #153](https://github.com/vadimdemedes/ink/issues/153)
- [Ink GitHub repository](https://github.com/vadimdemedes/ink)
- [React IME composition events issue #8683](https://github.com/facebook/react/issues/8683)
- [Claude Code Korean IME issue #22732](https://github.com/anthropics/claude-code/issues/22732)
- [figlet npm package](https://www.npmjs.com/package/figlet)
- [Ink v3 hooks and focus management](https://developerlife.com/2021/11/25/ink-v3-advanced-ui-components/)
- [TUI Development: Ink + React (2025)](https://combray.prose.sh/2025-12-01-tui-development)
- [fullscreen-ink npm](https://www.npmjs.com/package/fullscreen-ink) - resize handling reference

---
*Pitfalls research for: HiveChat v1.4 UI/UX Polish*
*Researched: 2026-03-21*
