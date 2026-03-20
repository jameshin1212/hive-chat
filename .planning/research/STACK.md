# Stack Research: v1.4 UI/UX Polish

**Domain:** CLI TUI onboarding, welcome screen, responsive layout
**Researched:** 2026-03-21
**Confidence:** HIGH

## Scope

v1.4 milestone 전용 stack 조사. 기존 validated stack (Ink 6, React 19, Hyperswarm, ws, string-width, conf, tsdown)은 재조사 대상 아님.

**Focus:** 온보딩 UI 개선, 웰컴 섹션 (ASCII art, 버전 표시, Tips), 반응형 터미널 레이아웃에 필요한 추가/변경 사항.

## Key Finding: 새 dependency 추가 불필요

v1.4에 필요한 모든 기능은 **기존 dependency로 구현 가능**하다. 새 npm package 추가 없이 진행할 것을 권장한다.

---

## 기존 Stack 활용 분석

### 1. ASCII Art / Banner: figlet (이미 설치됨)

| 항목 | 상세 |
|------|------|
| Package | `figlet` |
| 설치 버전 | 1.11.0 (최신) |
| Types | `@types/figlet@^1` (이미 devDependencies) |
| 현재 사용 | `AsciiBanner.tsx` -- `figlet.textSync('HIVECHAT', { font: 'Standard' })` |

**v1.4 활용 방법:**
- `figlet.fontsSync()`로 사용 가능한 300+ 폰트 목록 조회 가능
- 웰컴 화면에서 폰트 변경만으로 시각적 개선 가능 (예: `ANSI Shadow`, `Slant`, `Big`)
- `textSync`는 동기 호출 -- 초기 화면 즉시 표시에 적합
- 폰트별 출력 폭이 다르므로 `string-width`로 폭 확인 후 터미널 크기 초과 시 fallback 폰트 사용

**주의:** figlet 출력이 터미널 폭을 초과하면 줄바꿈으로 깨진다. 반응형 로직에서 반드시 폭 체크 필요.

### 2. 터미널 크기 감지 / 반응형: Ink useStdout (이미 사용 중)

| 항목 | 상세 |
|------|------|
| Hook | `useStdout()` from `ink` |
| 현재 사용 | `ChatScreen.tsx:42-44` -- `stdout?.columns`, `stdout?.rows` |
| Resize 동작 | Ink 내부에서 `stdout.on('resize', ...)` 리스닝 + 자동 re-render |

**v1.4 활용 방법:**
- Ink는 터미널 resize 시 자동으로 Yoga layout 재계산 + React re-render 수행
- `useStdout()` 반환값의 `stdout.columns`/`stdout.rows`는 Node.js가 resize 시 자동 업데이트
- Ink가 re-render를 트리거하므로 컴포넌트에서 fresh 값을 읽을 수 있음
- **별도의 `ink-use-stdout-dimensions` 패키지 불필요** -- `useStdout()`로 충분

**반응형 breakpoint 전략 (권장):**
```typescript
const { stdout } = useStdout();
const columns = stdout?.columns ?? 80;

// Breakpoints
const isNarrow = columns < 60;   // 최소 지원 -- graceful degradation
const isWide = columns >= 100;   // 사이드 패널 표시 가능
const isUltraWide = columns >= 140; // 확장 정보 표시
```

### 3. 색상 / 스타일: chalk (이미 설치됨)

| 항목 | 상세 |
|------|------|
| Package | `chalk` |
| 설치 버전 | ^5.6.2 |
| 현재 사용 | theme.ts, 각종 컴포넌트 |

**v1.4 활용 방법:**
- 웰컴 섹션의 프로필 정보, Tips 영역 스타일링
- `chalk.hex('#color')` 조합으로 Claude Code 스타일 UI 구현
- Ink의 `<Text color="..." bold dimColor>` 속성과 조합

### 4. 버전 표시: package.json 직접 참조

**구현 방법:**
```typescript
// client/src/version.ts
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { version } = require('../../package.json');
export const APP_VERSION = version;
```

또는 tsdown 빌드 시 `define` 옵션으로 주입:
```typescript
// tsdown.config.ts
export default {
  define: {
    '__APP_VERSION__': JSON.stringify(require('./package.json').version),
  },
};
```

**권장:** tsdown `define` 방식. 빌드 타임에 문자열로 치환되어 런타임 파일 읽기 불필요.

### 5. TUI 컴포넌트: Ink + @inkjs/ui (이미 설치됨)

| 항목 | 상세 |
|------|------|
| Package | `@inkjs/ui` |
| 설치 버전 | ^2.0.0 |
| 현재 사용 | **미사용** (dependency에만 존재) |

**v1.4 활용 가능 컴포넌트:**
- `<Spinner>` -- 연결 상태 표시, 로딩 인디케이터
- `<Badge>` -- AI CLI 뱃지 표시
- `<StatusMessage>` -- 시스템 메시지 (info/success/warning/error)

**주의:** 현재 미사용 중이므로, 실제 사용 시 Ink 6 + React 19 호환성 확인 필요. `@inkjs/ui@2.0.0`은 Ink 5 대상일 수 있음.

### 6. Box Drawing / 레이아웃 문자: 직접 구현

Unicode box-drawing 문자 (`\u2500`, `\u2502`, `\u250C`, `\u2510` 등)는 이미 사용 중.
`is-unicode-supported` 같은 패키지 없이, 현재 코드에서 `\u2500`을 직접 사용하고 있음.

**v1.4 권장:** CLAUDE.md 규칙대로 `is-unicode-supported`로 지원 여부 확인하되, 이는 선택적. 현재 대상 터미널(iTerm2, Terminal.app, Windows Terminal, GNOME Terminal)은 모두 Unicode 지원.

---

## 추가 검토 후 제외한 라이브러리

### gradient-string -- 제외

| 항목 | 상세 |
|------|------|
| Package | `gradient-string@3.0.0` |
| 특징 | ESM, pure JS, chalk ^5 의존 |
| 번들 크기 | ~15KB + tinygradient + tinycolor2 |

**제외 이유:**
- ASCII 배너에 gradient 효과를 줄 수 있으나, 시각적 장식에 불과
- dependency chain 추가 (gradient-string -> tinygradient -> tinycolor2)
- `chalk.hex()`로 단색/2색 조합이면 충분
- native dependency 없으므로 기술적으로는 사용 가능하나, 1MB 미만 번들 목표에서 불필요한 증가

### ink-use-stdout-dimensions -- 제외

| 항목 | 상세 |
|------|------|
| Package | `ink-use-stdout-dimensions` |
| 주간 다운로드 | ~140K |

**제외 이유:**
- Ink가 내부적으로 `stdout.on('resize')` 리스닝 + 자동 re-render 수행
- `useStdout()`의 `stdout.columns`/`stdout.rows`로 동일 기능 달성
- 현재 `ChatScreen.tsx`에서 이미 이 패턴 사용 중
- 불필요한 dependency 추가

### fullscreen-ink -- 제외

| 항목 | 상세 |
|------|------|
| Package | `fullscreen-ink` |
| 용도 | 전체화면 터미널 앱 |

**제외 이유:**
- HiveChat은 이미 `<Box height={rows}>` 패턴으로 전체 터미널 활용 중
- alternate screen buffer 전환이 필요할 경우에만 고려

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `ink-use-stdout-dimensions` | Ink 자체 resize re-render로 충분 | `useStdout()` + `stdout.columns/rows` |
| `gradient-string` | 불필요한 dependency chain, 장식적 효과 | `chalk.hex()` 단색/조합 |
| `blessed` / `neo-blessed` | CLAUDE.md 금지 -- abandoned, CJK 깨짐 | Ink 6 |
| `boxen` | Ink `<Box>` 컴포넌트가 동일 기능 | `<Box borderStyle="round">` |
| `terminal-link` | Ink `<Text>` + `\x1b]8;;` ANSI escape로 가능 | 직접 구현 |
| `cfonts` | figlet 대비 장점 없음, 번들 크기 큼 | `figlet` (이미 설치) |

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `figlet@1.11.0` | Node >=20, ESM (CJS wrapper) | `textSync` 동기 호출, ESM에서 default import 사용 |
| `@inkjs/ui@2.0.0` | Ink 5 대상으로 출시 | Ink 6 + React 19 호환성 직접 확인 필요 |
| `chalk@5.x` | ESM-only, Node >=12.17 | Ink 6과 완벽 호환 |
| `ink@6.8.0` | React 18/19 | resize 자동 re-render 내장 |

---

## 구현에 필요한 Custom Hooks / Utilities

기존 dependency만으로 v1.4 구현 시, 아래 custom 코드가 필요:

### useTerminalDimensions (custom hook)
```typescript
// Ink useStdout() wrapper -- 편의 + 기본값 + breakpoint 계산
function useTerminalDimensions() {
  const { stdout } = useStdout();
  const columns = stdout?.columns ?? 80;
  const rows = stdout?.rows ?? 24;
  return {
    columns, rows,
    isNarrow: columns < 60,
    isWide: columns >= 100,
    isUltraWide: columns >= 140,
  };
}
```

### responsiveBanner (utility)
```typescript
// 터미널 폭에 따라 figlet 폰트/텍스트 자동 조정
function getResponsiveBanner(columns: number): string {
  if (columns >= 80) return figlet.textSync('HIVECHAT', { font: 'ANSI Shadow' });
  if (columns >= 60) return figlet.textSync('HIVECHAT', { font: 'Standard' });
  return '=== HIVECHAT ===';  // 최소 폭 fallback
}
```

---

## Installation

**새로운 패키지 설치 불필요.** 기존 dependency만으로 v1.4 구현 가능.

```bash
# 기존 dependency 확인만
npm ls figlet chalk ink @inkjs/ui string-width
```

`@inkjs/ui`가 Ink 6과 호환 문제가 있을 경우에만:
```bash
# @inkjs/ui 제거 후 필요한 컴포넌트 직접 구현
npm uninstall @inkjs/ui
```

---

## Sources

- Ink GitHub repository -- resize 동작, useStdout hook 확인 ([GitHub](https://github.com/vadimdemedes/ink))
- Ink 소스코드 직접 확인 (`node_modules/ink/build/ink.js:188-214`) -- resize event listener + re-render 확인
- figlet npm -- v1.11.0 최신, 300+ 폰트 ([npm](https://www.npmjs.com/package/figlet))
- gradient-string -- ESM, pure JS, chalk ^5 의존 ([GitHub](https://github.com/bokub/gradient-string))
- ink-use-stdout-dimensions -- 140K weekly downloads ([npm](https://www.npmjs.com/package/ink-use-stdout-dimensions))
- Ink TUI expandable layouts guide ([Blog](https://combray.prose.sh/2025-11-28-ink-tui-expandable-layout))
- @inkjs/ui -- v2.0.0 stable ([npm](https://www.npmjs.com/package/@inkjs/ui))

---
*Stack research for: v1.4 UI/UX Polish milestone*
*Researched: 2026-03-21*
