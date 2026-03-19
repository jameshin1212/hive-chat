# Phase 1: Foundation - Research

**Researched:** 2026-03-19
**Domain:** TUI framework (Ink/React), CJK IME composition, CLI identity system, npm distribution
**Confidence:** MEDIUM-HIGH

## Summary

Phase 1은 Ink 6.x 기반 TUI에서 한글 IME 조합 입력을 정상 동작시키는 것이 최대 기술 리스크다. `ink-text-input`은 IME composition 로직이 전혀 없으므로 커스텀 TextInput 컴포넌트를 구현해야 한다. Ink 6.7.0에서 추가된 `useCursor` hook이 IME 커서 위치를 제어하는 핵심 API이며, 공식 `examples/cursor-ime` 예제가 기본 패턴을 제공한다. 단, 이 예제는 최소한의 뼈대일 뿐이고 backspace 자모 단위 삭제, 커서 이동, 히스토리 등은 직접 구현해야 한다.

Identity 시스템(`conf` + `nanoid`), ASCII 배너(`figlet`), 슬래시 명령어 파서는 표준 라이브러리 조합으로 직관적으로 구현 가능하다. monorepo 구조(`npm workspaces`)와 `tsdown` 번들링, `npx` 배포는 잘 문서화된 패턴이다.

**Primary recommendation:** `ink-text-input`을 사용하지 말고, Ink의 `useCursor` + `useInput` + `string-width`를 조합한 커스텀 IME-aware TextInput을 Phase 1 초반에 구현하고 한글 조합 테스트로 검증하라. 이 컴포넌트가 Phase 1의 핵심이자 가장 큰 리스크다.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- 풀스크린 채팅 모드 (사이드바 없음)
- 상단: 메시지 영역 (스크롤), 하단: 고정 입력 영역
- 사용자 목록은 `/users` 슬래시 명령어로 표시
- 상태바 표시 정보: 내 ID + AI CLI 뱃지, 연결 상태, 근처 사용자 수, 현재 발견 범위
- 슬래시 명령어 체계: `/users`, `/friends`, `/chat`, `/quit`, `/settings` 등
- 뱃지 포함 형식: `[Claude Code] coder#3A7F: message`
- 터미널 기본 배경색 유지, 기본 텍스트 초록색 (레트로 터미널)
- 사용자 테마 색상: 흰색, 노랑, 빨강, 핑크, 핫핑크, 보라, 주황
- 한글 조합 중 실시간 표시, 밀림/깨짐 없음, 커서 정확 위치, backspace 자모 단위 삭제
- 입력 중에도 새 메시지 수신 표시, Enter로 전송, 화살표 히스토리, 멀티라인 자동 줄바꿈
- Onboarding: ASCII 배너 -> 닉네임 입력 -> AI CLI 선택 -> 채팅 화면
- 닉네임: 영숫자만 (a-z, 0-9, 하이픈, 언더스코어, 1-16자)
- AI CLI 선택: 목록에서 화살표로 선택 (Claude Code, Codex, Gemini, Cursor)
- 재실행 시: "Welcome back, coder#3A7F" 환영 메시지 후 바로 채팅 화면
- 설정 변경: `/settings` 메뉴에서 닉네임, AI CLI 한꺼번에 변경
- 패키지명: `cling-talk` (npx cling-talk)
- 프로젝트명: Cling Talk

### Claude's Discretion
- IME 구현 접근 방식 (Ink 직접, readline hybrid, 커스텀 등)
- monorepo 관리 도구 선택 (npm workspaces vs turborepo)
- 최소 Node.js 버전 (20 LTS vs 22 LTS)
- Phase 1에서 서버 패키지 구조 포함 여부
- ASCII 아트 로고 디자인
- 정확한 색상 코드/밝기
- 로딩 스피너/스켈레톤 디자인

### Deferred Ideas (OUT OF SCOPE)
- 프로젝트명 변경에 따라 PROJECT.md, REQUIREMENTS.md, ROADMAP.md 업데이트 필요 (이 Phase context 커밋 후)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| IDEN-01 | 최초 실행 시 닉네임 입력 + 고유태그 자동발급 (nick#1234 형식) | `conf` 패키지로 XDG 호환 로컬 저장, `nanoid` 또는 `crypto.randomBytes`로 태그 생성, Ink onboarding flow로 닉네임 입력 UI |
| IDEN-02 | AI CLI 도구 선택 및 뱃지 표시 | `@inkjs/ui` SelectInput 또는 Ink `useInput`으로 화살표 선택 UI, `conf`에 설정 저장, chalk로 뱃지 색상 렌더링 |
| TUI-01 | 스플릿 레이아웃 (메시지 영역 + 입력 영역) | Ink `Box` flexDirection="column" + `flexGrow` 로 상단 메시지/하단 입력 분리, `useStdout` hook으로 터미널 크기 감지 |
| TUI-02 | 한글/CJK IME 조합 정상 처리 | 커스텀 TextInput + `useCursor` hook + `string-width` 조합, Ink의 `examples/cursor-ime` 패턴 기반 확장 |
| TUI-04 | Ctrl+C 또는 /quit으로 깔끔한 종료 | Ink `useApp().exit()` + process SIGINT handler, 2초 force-exit timeout |
| DIST-01 | npm 패키지로 배포, npx cling-talk으로 즉시 실행 | `tsdown` 단일 번들, `package.json` bin 필드, `files` 화이트리스트, npm pack 크기 검증 |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ink | 6.8.0 | TUI framework (React for terminal) | `useCursor` hook으로 IME 커서 위치 제어, Flexbox 레이아웃, React 18 reconciliation으로 효율적 리렌더링 |
| react | 18.x | UI component model | Ink 6.x 필수 dependency |
| conf | 15.1.0 | XDG 호환 로컬 설정 저장 | Identity, AI CLI 선택 등 세션 간 유지 데이터. JSON schema migration 지원 |
| string-width | 8.2.0 | 멀티바이트 문자 폭 계산 | CJK 2-column, emoji 2-column, ASCII 1-column 정확 계산. IME 커서 위치에 필수 |
| zod | 4.3.6 | Schema validation | Identity/config schema 검증, shared protocol types 기반 |
| chalk | 5.6.2 | 터미널 색상 | 뱃지, 닉네임, UI 요소 색상. Ink와 함께 사용 |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| nanoid | 5.1.7 | 고유 태그 생성 | nick#tag 에서 4자리 hex 태그 생성. URL-safe, 짧음. 대안: `crypto.randomBytes(2).toString('hex')` |
| figlet | 1.11.0 | ASCII art 텍스트 | Onboarding 시 "CLING TALK" ASCII 배너 생성 |
| @inkjs/ui | 2.0.0 | Ink UI 컴포넌트 모음 | SelectInput (AI CLI 선택), Spinner (로딩) 등. TextInput은 IME 미지원이므로 사용하지 말 것 |
| supports-color | 10.2.2 | 터미널 색상 depth 감지 | truecolor/256/16/mono graceful degradation |
| is-unicode-supported | 2.1.0 | Unicode 문자 지원 감지 | box-drawing 문자 vs ASCII fallback 결정 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `ink-text-input` | 커스텀 TextInput | ink-text-input에 IME 로직 없음. 반드시 커스텀 구현 필요 |
| `nanoid` | `crypto.randomBytes` | nanoid가 더 짧고 편리하지만, 4자리 hex tag라면 crypto.randomBytes(2)로도 충분 |
| npm workspaces | turborepo | npm workspaces가 zero-dependency로 이 프로젝트 규모에 적합. turborepo는 오버스펙 |
| `figlet` | 하드코딩 ASCII art | figlet이 폰트 선택 유연성 제공. 빌드타임에 생성하여 런타임 dependency 제거 가능 |

**Installation (Phase 1 client 패키지):**
```bash
npm install ink react string-width conf zod chalk nanoid figlet @inkjs/ui supports-color is-unicode-supported
npm install -D typescript @types/react tsdown vitest tsx @types/figlet
```

## Architecture Patterns

### Recommended Project Structure (Phase 1)

```
cling-talk/
├── packages/
│   ├── client/
│   │   ├── src/
│   │   │   ├── ui/
│   │   │   │   ├── App.tsx              # 메인 앱 (라우팅: onboarding/chat)
│   │   │   │   ├── screens/
│   │   │   │   │   ├── OnboardingScreen.tsx  # 닉네임 입력 + AI CLI 선택
│   │   │   │   │   └── ChatScreen.tsx        # 메인 채팅 화면
│   │   │   │   ├── components/
│   │   │   │   │   ├── IMETextInput.tsx      # 커스텀 IME-aware 입력
│   │   │   │   │   ├── MessageArea.tsx       # 스크롤 메시지 영역
│   │   │   │   │   ├── StatusBar.tsx         # 상태바 (ID+뱃지, 연결상태 등)
│   │   │   │   │   ├── AsciiBanner.tsx       # figlet ASCII 로고
│   │   │   │   │   └── AiCliSelector.tsx     # AI CLI 선택 UI
│   │   │   │   └── theme.ts                  # 색상 테마 정의
│   │   │   ├── identity/
│   │   │   │   └── IdentityManager.ts  # nick#tag 생성/저장/로드
│   │   │   ├── commands/
│   │   │   │   └── CommandParser.ts    # 슬래시 명령어 파서
│   │   │   ├── config/
│   │   │   │   └── AppConfig.ts        # conf 기반 설정 관리
│   │   │   └── index.tsx               # CLI 엔트리포인트
│   │   ├── bin/
│   │   │   └── cling-talk.js           # npx 실행 엔트리 (shebang)
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── shared/
│       ├── src/
│       │   ├── protocol.ts             # 메시지 프로토콜 (Phase 2+에서 확장)
│       │   ├── types.ts                # 공유 타입 (Identity, AiCli enum 등)
│       │   ├── schemas.ts             # zod schema 정의
│       │   └── constants.ts           # 상수 (닉네임 규칙, 태그 길이 등)
│       ├── package.json
│       └── tsconfig.json
├── package.json                        # workspace root
├── tsconfig.json                       # base tsconfig
└── vitest.config.ts
```

**Discretion decisions:**
- **npm workspaces** 사용 (turborepo 불필요 -- 3개 패키지 규모)
- **Node.js >= 20 LTS** (22 LTS도 가능하나 20이 더 넓은 호환성)
- **Phase 1에서 server 패키지 구조 미포함** -- shared만 포함하여 타입 기반을 마련. server는 Phase 2에서 추가

### Pattern 1: Custom IME-Aware TextInput

**What:** Ink의 `useCursor` + `useInput` + `string-width`를 조합한 커스텀 텍스트 입력 컴포넌트
**When to use:** 한글/CJK IME 조합 입력이 필요한 모든 텍스트 필드

**핵심 원리:** Ink의 `useInput`은 IME 조합 완료 후의 문자를 전달한다. `useCursor`로 real cursor 위치를 IME가 읽을 수 있도록 설정하면, OS IME가 해당 위치에 조합 창을 표시한다. 즉 Ink 자체가 조합 중 문자를 렌더링하는 것이 아니라, OS IME 후보 창이 올바른 위치에 표시되어 사용자에게 조합 과정이 보이는 방식이다.

**기반 패턴 (Ink 공식 `examples/cursor-ime`):**
```typescript
// Source: https://github.com/vadimdemedes/ink/blob/master/examples/cursor-ime/cursor-ime.tsx
import React, {useState} from 'react';
import stringWidth from 'string-width';
import {Box, Text, useInput, useCursor} from 'ink';

function IMETextInput({onSubmit}: {onSubmit: (text: string) => void}) {
  const [text, setText] = useState('');
  const {setCursorPosition} = useCursor();

  useInput((input, key) => {
    if (key.return) {
      onSubmit(text);
      setText('');
      return;
    }
    if (key.backspace || key.delete) {
      setText(prev => prev.slice(0, -1));
      return;
    }
    if (!key.ctrl && !key.meta && input) {
      setText(prev => prev + input);
    }
  });

  const prompt = '> ';
  // string-width로 CJK/이모지 폭 정확 계산
  setCursorPosition({x: stringWidth(prompt + text), y: 0});

  return (
    <Text>{prompt}{text}</Text>
  );
}
```

**확장 필요 사항:**
- 커서 이동 (좌/우 화살표, Home/End)
- 입력 히스토리 (위/아래 화살표)
- 멀티라인 자동 줄바꿈 (터미널 폭 기준)
- placeholder 텍스트
- 슬래시 명령어 감지 (`/` 시작 시 명령어 모드)

### Pattern 2: Screen Router (Onboarding -> Chat)

**What:** React state 기반 화면 전환
**When to use:** 앱 시작 시 onboarding과 채팅 화면 간 전환

```typescript
function App() {
  const identity = useIdentity(); // conf에서 로드
  const [screen, setScreen] = useState<'onboarding' | 'chat'>(
    identity ? 'chat' : 'onboarding'
  );

  if (screen === 'onboarding') {
    return <OnboardingScreen onComplete={() => setScreen('chat')} />;
  }
  return <ChatScreen identity={identity} />;
}
```

### Pattern 3: Event-Driven Architecture (Phase 2+ 대비)

**What:** EventEmitter 기반 내부 통신 버스
**When to use:** UI <-> ChatManager <-> ConnectionManager 간 통신

Phase 1에서는 아직 네트워크 레이어가 없으므로, 기본 구조만 마련:
```typescript
// EventBus 타입 정의 (shared/types.ts)
export interface AppEvents {
  'message:send': (content: string) => void;
  'message:received': (msg: ChatMessage) => void;
  'command:execute': (cmd: SlashCommand) => void;
  'identity:updated': (identity: Identity) => void;
}
```

### Anti-Patterns to Avoid

- **`ink-text-input` 직접 사용:** IME composition 로직이 전혀 없음. 한글 입력 시 조합 중 문자가 보이지 않는 심각한 문제 발생
- **raw mode에서 직접 한글 바이트 파싱:** 극도로 복잡하고 터미널/OS별로 다름. `useCursor`로 OS IME에 위임하는 것이 올바른 접근
- **TUI 컴포넌트에서 직접 conf/파일 접근:** IdentityManager를 통해 접근. UI-비즈니스 로직 분리
- **`string.length` 사용:** CJK/이모지에서 잘못된 값 반환. 항상 `string-width` 사용

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| XDG 호환 설정 저장 | 직접 fs + path 조합 | `conf` 15.1.0 | 플랫폼별 경로($XDG_CONFIG_HOME, %APPDATA%), schema migration, atomic write |
| 문자열 표시 폭 | `.length` 또는 regex | `string-width` 8.2.0 | CJK=2, emoji=2, ASCII=1, zero-width joiner 처리 등 엣지케이스 다수 |
| ASCII art 텍스트 | 하드코딩 문자열 | `figlet` 1.11.0 | 다양한 FIGlet 폰트 지원. 빌드타임 생성으로 런타임 비용 제거 가능 |
| 터미널 색상 감지 | `process.env.TERM` 파싱 | `supports-color` 10.2.2 | 16/256/truecolor 감지, CI 환경 처리, `--color`/`--no-color` 플래그 처리 |
| 고유 ID 생성 | Math.random() hex | `crypto.randomBytes` (Node.js built-in) | 암호학적으로 안전한 랜덤. 예측 불가능한 태그 생성 필수 (보안 요구사항) |
| Schema validation | if/else 체인 | `zod` 4.3.6 | 타입 추론 + 런타임 검증 통합. shared 패키지에서 protocol 검증에 필수 |

**Key insight:** Phase 1의 "Don't Hand-Roll" 핵심은 IME 처리이다. OS IME에 커서 위치를 알려주고 조합을 위임하는 `useCursor` 패턴을 사용해야 하며, raw bytes에서 한글 자모를 직접 조합하려 시도하면 안 된다.

## Common Pitfalls

### Pitfall 1: ink-text-input 사용 시 한글 조합 불가
**What goes wrong:** `ink-text-input`은 IME composition 이벤트를 처리하지 않음. 한글 입력 시 조합 중 문자가 보이지 않거나 깨짐
**Why it happens:** `ink-text-input`의 소스코드에 IME composition 관련 로직이 전혀 없음. `onCompositionStart`/`onCompositionEnd` 미처리
**How to avoid:** `ink-text-input` 대신 커스텀 TextInput 구현. `useCursor` hook으로 OS IME에 커서 위치 전달. 반드시 한글 IME로 조합 테스트 실행 (ㅎ+ㅏ+ㄴ=한)
**Warning signs:** 영어 입력은 되지만 한글 전환 시 아무것도 안 보임

### Pitfall 2: string-width 미사용으로 커서 위치 오류
**What goes wrong:** `text.length` 사용 시 CJK 문자(2-column)와 이모지(2-column)의 실제 터미널 폭을 잘못 계산. 커서가 텍스트 끝이 아닌 중간에 위치
**Why it happens:** JavaScript의 `.length`는 UTF-16 코드유닛 수를 반환. 한글은 1이지만 터미널에서 2칸 차지. 이모지는 surrogate pair로 2이지만 터미널에서 2칸
**How to avoid:** 모든 커서 위치 계산과 UI 정렬에 `string-width` 사용. `text.length`로 문자열 폭을 계산하는 코드가 있으면 즉시 수정
**Warning signs:** 한글 닉네임과 영문 닉네임이 섞인 목록에서 컬럼 정렬 깨짐

### Pitfall 3: conf에서 schema 버전 미관리
**What goes wrong:** Identity 데이터 구조가 Phase 2+에서 변경될 때 기존 사용자 설정 파일이 깨짐
**Why it happens:** 처음에 schema version 필드를 넣지 않으면 migration path가 없음
**How to avoid:** 처음부터 `schemaVersion: 1` 필드 포함. `conf`의 `migrations` 옵션 활용
**Warning signs:** 기존 사용자가 업데이트 후 "닉네임을 다시 입력하세요" 표시

### Pitfall 4: npx 첫 실행 시 아무 출력 없이 10초+ 대기
**What goes wrong:** dependency 설치 중 사용자에게 아무 피드백 없음. Ctrl+C로 중단
**Why it happens:** `tsdown` 번들링 없이 dependency가 많으면 설치 시간 증가
**How to avoid:** `tsdown`으로 단일 파일 번들. `package.json`의 `files` 필드로 배포 파일 최소화. `npm pack` 크기 1MB 미만 유지. bin 엔트리에서 즉시 ASCII 배너 출력
**Warning signs:** `npm pack` 크기 > 1MB, `npm install` 5초 이상

### Pitfall 5: Ink fullscreen 모드에서 SIGINT 처리 누락
**What goes wrong:** Ctrl+C 시 터미널이 raw mode에 갇혀 프롬프트 복구 안 됨
**Why it happens:** Ink의 `useApp().exit()` 호출 없이 process.exit() 직접 호출하면 cleanup 미실행
**How to avoid:** `useApp().exit()` 사용 + process 'exit' 이벤트에서 `process.stdout.write('\x1b[?25h')` (커서 복구) 실행. 2초 timeout 후 강제 종료
**Warning signs:** Ctrl+C 후 터미널에 키 입력이 안 보임 (raw mode 잔류)

## Code Examples

### Identity 생성 및 저장

```typescript
// Source: conf docs + crypto.randomBytes API
import Conf from 'conf';
import crypto from 'node:crypto';
import {z} from 'zod';

const identitySchema = z.object({
  nickname: z.string().regex(/^[a-z0-9_-]{1,16}$/),
  tag: z.string().length(4),
  aiCli: z.enum(['Claude Code', 'Codex', 'Gemini', 'Cursor']),
  schemaVersion: z.literal(1),
});

type Identity = z.infer<typeof identitySchema>;

const config = new Conf<{identity?: Identity}>({
  projectName: 'cling-talk',
  schema: {
    identity: {
      type: 'object',
      properties: {
        nickname: {type: 'string'},
        tag: {type: 'string'},
        aiCli: {type: 'string'},
        schemaVersion: {type: 'number'},
      },
    },
  },
});

function generateTag(): string {
  return crypto.randomBytes(2).toString('hex').toUpperCase(); // e.g., "3A7F"
}

function saveIdentity(nickname: string, aiCli: Identity['aiCli']): Identity {
  const identity: Identity = {
    nickname,
    tag: generateTag(),
    aiCli,
    schemaVersion: 1,
  };
  config.set('identity', identity);
  return identity;
}

function loadIdentity(): Identity | undefined {
  return config.get('identity');
}
```

### Split Layout (메시지 + 입력)

```typescript
// Source: Ink docs (Box flexDirection, flexGrow)
import React from 'react';
import {Box, Text, useStdout} from 'ink';

function ChatScreen() {
  const {stdout} = useStdout();
  const rows = stdout?.rows ?? 24;

  return (
    <Box flexDirection="column" height={rows}>
      {/* 상태바 */}
      <Box>
        <Text color="green">[Claude Code] coder#3A7F</Text>
        <Text> | </Text>
        <Text color="yellow">offline</Text>
      </Box>

      {/* 메시지 영역 (나머지 공간 차지) */}
      <Box flexDirection="column" flexGrow={1} overflow="hidden">
        <MessageArea />
      </Box>

      {/* 구분선 */}
      <Box>
        <Text color="green">{'─'.repeat(stdout?.columns ?? 80)}</Text>
      </Box>

      {/* 입력 영역 (고정) */}
      <Box>
        <IMETextInput onSubmit={handleSend} />
      </Box>
    </Box>
  );
}
```

### Slash Command Parser

```typescript
// 슬래시 명령어 파싱 패턴
const COMMANDS = {
  '/quit': {description: 'Exit Cling Talk', handler: handleQuit},
  '/users': {description: 'Show nearby users', handler: handleUsers},
  '/settings': {description: 'Open settings', handler: handleSettings},
  '/help': {description: 'Show commands', handler: handleHelp},
} as const;

function parseInput(input: string): {type: 'command'; name: string; args: string[]} | {type: 'message'; content: string} {
  if (input.startsWith('/')) {
    const [name, ...args] = input.split(' ');
    if (name && name in COMMANDS) {
      return {type: 'command', name, args};
    }
  }
  return {type: 'message', content: input};
}
```

### Graceful Exit

```typescript
// Source: Ink useApp docs + Node.js process events
import {useApp} from 'ink';

function useGracefulExit() {
  const {exit} = useApp();

  const handleExit = () => {
    // cleanup: 향후 네트워크 연결 종료 등 추가
    exit();

    // 2초 후 강제 종료 (cleanup 실패 대비)
    setTimeout(() => {
      process.stdout.write('\x1b[?25h'); // 커서 복구
      process.exit(0);
    }, 2000).unref();
  };

  return handleExit;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `ink-text-input` for all input | Custom TextInput + `useCursor` for IME | Ink 6.7.0 (2024) | CJK IME 커서 위치 제어 가능. 이전 버전에서는 불가능했던 IME 지원 |
| `tsup` for bundling | `tsdown` (Rolldown 기반) | 2025 | tsup 유지보수 중단. tsdown이 공식 후속 |
| `blessed`/`neo-blessed` for TUI | Ink 6.x (React for CLI) | 2023+ | blessed 사실상 중단. Ink가 활발한 생태계 유지 |
| `configstore` for config | `conf` 15.x | 2024 | 더 활발한 유지보수, TypeScript 지원, schema migration |

**Deprecated/outdated:**
- `ink-text-input`: IME 미지원. 커스텀 구현 필요
- `blessed`/`neo-blessed`: 유지보수 중단, CJK 깨짐
- `tsup`: 유지보수 중단. tsdown으로 전환

## Open Questions

1. **Ink `useCursor` + macOS 한글 IME 실제 동작 검증**
   - What we know: Ink 6.7.0에 `useCursor` 추가됨. `examples/cursor-ime` 예제 존재. Claude Code/Gemini CLI에서도 같은 문제 보고됨
   - What's unclear: macOS Terminal.app / iTerm2에서 `useCursor`가 IME 후보 창 위치를 실제로 올바르게 제어하는지 실증 데이터 없음. 일부 터미널에서는 IME 후보 창이 여전히 왼쪽 하단에 뜰 수 있음
   - Recommendation: Phase 1 첫 태스크에서 최소 프로토타입으로 한글 IME 동작 검증 필수. 실패 시 hybrid 접근(raw mode off for input) 검토

2. **figlet 런타임 vs 빌드타임 생성**
   - What we know: figlet은 ~200KB의 폰트 데이터 포함. 런타임 dependency로 추가하면 번들 크기 증가
   - What's unclear: tsdown이 figlet을 효율적으로 트리쉐이킹하는지
   - Recommendation: ASCII 배너를 빌드타임에 생성하여 문자열 상수로 포함. figlet은 devDependency로만 사용

3. **zod 4.x vs 3.x**
   - What we know: npm에서 zod 최신 버전이 4.3.6으로 표시됨. zod 4는 major breaking change 가능
   - What's unclear: zod 4의 안정성과 Ink/React 생태계 호환성
   - Recommendation: zod 4.x가 안정적이면 사용, 그렇지 않으면 3.24.x로 고정

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.1.0 |
| Config file | `vitest.config.ts` (Wave 0에서 생성) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| IDEN-01 | nick#tag 생성/저장/로드 | unit | `npx vitest run packages/client/src/identity/IdentityManager.test.ts -x` | Wave 0 |
| IDEN-02 | AI CLI 선택/저장/로드 | unit | `npx vitest run packages/client/src/identity/IdentityManager.test.ts -x` | Wave 0 |
| TUI-01 | 스플릿 레이아웃 렌더링 | smoke (ink-testing-library) | `npx vitest run packages/client/src/ui/screens/ChatScreen.test.tsx -x` | Wave 0 |
| TUI-02 | 한글 IME 입력 (string-width 기반 커서 계산) | unit + manual | `npx vitest run packages/client/src/ui/components/IMETextInput.test.tsx -x` | Wave 0 |
| TUI-04 | /quit 및 Ctrl+C 종료 | unit | `npx vitest run packages/client/src/commands/CommandParser.test.ts -x` | Wave 0 |
| DIST-01 | package.json bin, npm pack 크기 | smoke | `npm pack --dry-run 2>&1 | tail -1` | Wave 0 |

**Note:** TUI-02의 실제 한글 IME 조합 테스트는 자동화 불가 (OS IME 의존). unit test로 string-width 기반 커서 위치 계산 정확성 검증 + manual test로 실제 한글 입력 검증.

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green + manual 한글 IME 검증

### Wave 0 Gaps
- [ ] `vitest.config.ts` -- workspace root 설정
- [ ] `packages/client/src/identity/IdentityManager.test.ts` -- IDEN-01, IDEN-02
- [ ] `packages/client/src/ui/components/IMETextInput.test.tsx` -- TUI-02 (string-width 계산)
- [ ] `packages/client/src/ui/screens/ChatScreen.test.tsx` -- TUI-01 (레이아웃 스냅샷)
- [ ] `packages/client/src/commands/CommandParser.test.ts` -- TUI-04
- [ ] Framework install: `npm install -D vitest @testing-library/react ink-testing-library`

## Sources

### Primary (HIGH confidence)
- [Ink GitHub](https://github.com/vadimdemedes/ink) -- `useCursor` hook, `examples/cursor-ime` 예제, Flexbox layout
- [ink-text-input source](https://github.com/vadimdemedes/ink-text-input/blob/master/source/index.tsx) -- IME 로직 부재 확인
- [Ink v6.7.0 release](https://github.com/vadimdemedes/ink/releases/tag/v6.7.0) -- IME cursor positioning API 추가
- [string-width npm](https://www.npmjs.com/package/string-width) -- v8.2.0 확인
- [conf npm](https://www.npmjs.com/package/conf) -- v15.1.0, XDG 호환

### Secondary (MEDIUM confidence)
- [Claude Code IME issue #22732](https://github.com/anthropics/claude-code/issues/22732) -- Ink 기반 앱의 한글 IME 문제 실제 사례
- [Gemini CLI IME issue #3014](https://github.com/google-gemini/gemini-cli/issues/3014) -- 터미널 IME 문제가 Ink 특정이 아닌 범용 문제
- [Claude Code IME investigation #3045](https://github.com/anthropics/claude-code/issues/3045) -- React Ink 패치로 IME 문제 해결 시도
- [cmux CJK IME fix PR #125](https://github.com/manaflow-ai/cmux/pull/125) -- CJK IME 수정 패턴 참조 (터미널 에뮬레이터 수준)
- [tsdown official site](https://tsdown.dev/) -- Rolldown 기반 번들러, tsup 후속

### Tertiary (LOW confidence)
- zod 4.x 안정성 -- npm 레지스트리에서 4.3.6 확인되었으나 major version 호환성 미검증
- Ink `useCursor` + 특정 터미널(Terminal.app, iTerm2, Windows Terminal)에서의 IME 후보 창 위치 정확도 -- 실증 데이터 부족

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Ink 6.8.0, conf 15.1.0, string-width 8.2.0 등 모두 npm 최신 버전 확인, 활발히 유지보수
- Architecture: HIGH -- monorepo 구조, Ink 컴포넌트 패턴은 잘 문서화됨
- IME/CJK handling: MEDIUM -- `useCursor` API 존재 확인, 공식 예제 확인, 하지만 실제 한글 IME 조합 동작은 프로토타입으로 검증 필요
- Pitfalls: HIGH -- Claude Code, Gemini CLI 등 실제 사례에서 확인된 문제들

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (Ink 생태계는 비교적 안정적)
