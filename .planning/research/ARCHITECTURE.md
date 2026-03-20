# Architecture Research

**Domain:** TUI UI/UX Polish (Onboarding, Welcome Section, Responsive Layout)
**Researched:** 2026-03-21
**Confidence:** HIGH

## System Overview — Current vs. Target

```
Current Screen Flow:
┌───────────────────────────────────────────────────────────┐
│ App.tsx                                                   │
│  ├── [no identity] → OnboardingScreen                    │
│  │     └── welcome → nickname → ai-cli → done            │
│  ├── [returning]  → WelcomeBack splash (1.5s setTimeout) │
│  └── [ready]      → ChatScreen (lobby + chat states)     │
│                       ├── MessageArea (empty: "No messages") │
│                       ├── Overlays (UserList, Friends...)│
│                       ├── StatusBar                      │
│                       └── IMETextInput                   │
└───────────────────────────────────────────────────────────┘

Target Screen Flow (v1.4):
┌───────────────────────────────────────────────────────────┐
│ App.tsx                                                   │
│  ├── [no identity] → OnboardingScreen (ENHANCED)         │
│  │     └── Animated step indicator + box layout          │
│  ├── [returning]  → (removed, merged into WelcomeSection)│
│  └── [ready]      → ChatScreen                           │
│                       ├── WelcomeSection (NEW, lobby only)│
│                       │     ├── ASCII banner + version   │
│                       │     ├── ProfileCard              │
│                       │     ├── TipsPanel                │
│                       │     └── (wide) SidePanel         │
│                       ├── MessageArea                    │
│                       ├── Overlays                       │
│                       ├── StatusBar                      │
│                       └── IMETextInput                   │
└───────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Status |
|-----------|----------------|--------|
| `App.tsx` | Screen routing (onboarding/chat), identity state | **MODIFY** — WelcomeBack splash 제거 |
| `OnboardingScreen` | First-run nickname + AI CLI setup | **MODIFY** — UI 개선 (step indicator, box layout) |
| `WelcomeSection` | Lobby 상태에서 빈 MessageArea 대신 표시 | **NEW** — 핵심 신규 컴포넌트 |
| `ProfileCard` | 닉네임, AI CLI, 연결 상태 요약 | **NEW** — WelcomeSection 하위 |
| `TipsPanel` | 사용 팁 표시 (명령어, 단축키) | **NEW** — WelcomeSection 하위 |
| `useTerminalSize` | 터미널 크기 변화 감지 + breakpoint 분류 | **NEW** — custom hook |
| `ChatScreen` | Lobby/chat 상태 관리, 레이아웃 구성 | **MODIFY** — responsive breakpoints, WelcomeSection 통합 |
| `MessageArea` | 메시지 표시 + 스크롤 | Unchanged |
| `StatusBar` | 연결/채팅 상태 표시 | **MODIFY** — 좁은 터미널 truncation |
| `IMETextInput` | CJK-safe 텍스트 입력 | Unchanged |

## Recommended Architecture

### 1. WelcomeSection — ChatScreen 내부 조건부 렌더링

WelcomeSection은 별도 Screen이 아니라 **ChatScreen 내부**에서 lobby 상태일 때 MessageArea 영역을 대체한다. 이유:

- 연결 상태(`status`), 사용자 수(`users.length`), 친구 수 등 ChatScreen의 기존 state에 의존
- 메시지가 오면 자연스럽게 WelcomeSection이 사라지고 MessageArea로 전환
- 별도 Screen으로 만들면 lobby->chat 전환 시 불필요한 unmount/remount 발생

```typescript
// ChatScreen.tsx 내부
const isLobby = !isInChat && displayMessages.length === 0;

return (
  <Box flexDirection="column" height={rows}>
    {isLobby ? (
      <WelcomeSection
        identity={identity}
        connectionStatus={status}
        nearbyCount={users.length}
        friendCount={friendCount}
        onlineFriendCount={onlineFriendCount}
        availableHeight={messageAreaHeight}
        columns={columns}
        layout={layout}  // from useTerminalSize
      />
    ) : (
      <MessageArea ... />
    )}
    {/* overlays, status bar, input — unchanged */}
  </Box>
);
```

### 2. useTerminalSize Hook — Responsive Breakpoints

Ink의 `useStdout()`는 `stdout.columns`/`stdout.rows`를 제공하지만 resize 이벤트를 자동 re-render하지 않는다. Custom hook으로 `stdout.on('resize')` 감지 필요.

```typescript
// hooks/useTerminalSize.ts
type TerminalLayout = 'compact' | 'normal' | 'wide';

interface TerminalSize {
  columns: number;
  rows: number;
  layout: TerminalLayout;
}

function getLayout(columns: number): TerminalLayout {
  if (columns < 80) return 'compact';   // 60-79: 최소 정보만
  if (columns < 120) return 'normal';   // 80-119: 기본 레이아웃
  return 'wide';                         // 120+: 사이드 패널 가능
}

export function useTerminalSize(): TerminalSize {
  const { stdout } = useStdout();
  const [size, setSize] = useState({
    columns: stdout?.columns ?? DEFAULT_TERMINAL_WIDTH,
    rows: stdout?.rows ?? 24,
  });

  useEffect(() => {
    if (!stdout) return;
    const onResize = () => {
      setSize({ columns: stdout.columns, rows: stdout.rows });
    };
    stdout.on('resize', onResize);
    return () => { stdout.off('resize', onResize); };
  }, [stdout]);

  return { ...size, layout: getLayout(size.columns) };
}
```

**Breakpoint 정의:**

| Layout | Columns | 동작 |
|--------|---------|------|
| `compact` | 60-79 | StatusBar 축약, WelcomeSection 단일 컬럼, Tips 숨김 |
| `normal` | 80-119 | 기본 레이아웃, WelcomeSection 풀 표시 |
| `wide` | 120+ | 사이드 패널 (Tips/Recent activity) 옆에 표시 |

### 3. OnboardingScreen 개선 — 기존 구조 유지, UI만 강화

현재 step-based 구조(`welcome -> nickname -> ai-cli`)는 그대로 유지. 변경 사항:

```
┌────────────────────────────────────────────┐
│  HIVECHAT (ASCII Banner)                   │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │  Step 1 of 2: Choose a nickname      │  │
│  │                                      │  │
│  │  > your-nickname█                    │  │
│  │                                      │  │
│  │  a-z, 0-9, -, _ (1-16 chars)        │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  [1] ●───○ [2]                             │
└────────────────────────────────────────────┘
```

- `Box borderStyle="round"` (Ink 기본 제공)로 입력 영역 감싸기
- Step indicator 하단 표시
- `welcome` step은 제거하거나 매우 짧게 — Enter 한 번 누르는 불필요한 단계

**수정 범위**: `OnboardingScreen.tsx`만. Props 변경 없음, `App.tsx` 영향 없음.

### 4. WelcomeBack Splash 제거

현재 `App.tsx`의 `setTimeout(() => setShowWelcomeBack(false), 1500)` 패턴은:
- `setTimeout` in render = React anti-pattern
- 1.5초 강제 대기 = 나쁜 UX

대신 WelcomeSection에 프로필 정보를 포함시켜 returning user가 자연스럽게 자신의 상태를 확인할 수 있게 한다.

## Data Flow

### WelcomeSection Data Flow

```
App.tsx
  └── identity (from loadIdentity/onboarding)
        ↓
ChatScreen
  ├── useServerConnection(identity) → status, transportType
  ├── useNearbyUsers(client) → users
  ├── useFriends(client, status) → friendStatuses
  └── WelcomeSection receives:
        ├── identity (nickname, tag, aiCli)
        ├── connectionStatus
        ├── nearbyCount
        ├── friendCount / onlineFriendCount
        ├── availableHeight / columns
        └── layout (from useTerminalSize)
```

**핵심: 새로운 data source 불필요.** 모든 데이터가 ChatScreen의 기존 hooks에서 이미 제공됨.

### Responsive Layout Data Flow

```
useTerminalSize()
  ↓ { columns, rows, layout }
ChatScreen
  ├── layout === 'compact' → StatusBar condensed, WelcomeSection minimal
  ├── layout === 'normal'  → 현재와 동일한 레이아웃
  └── layout === 'wide'    → WelcomeSection에 사이드 패널 추가
```

## Architectural Patterns

### Pattern 1: Conditional Region Rendering (WelcomeSection)

**What:** Lobby 상태에서 MessageArea 영역을 WelcomeSection으로 대체
**When to use:** 같은 물리적 영역에 context-dependent 컨텐츠 표시
**Trade-offs:** 단순하고 전환이 자연스러움. 단, WelcomeSection과 MessageArea의 height 계산이 동일해야 함.

```typescript
// 핵심: 같은 availableHeight를 사용
{isLobby ? (
  <WelcomeSection availableHeight={messageAreaHeight} ... />
) : (
  <MessageArea availableHeight={messageAreaHeight} ... />
)}
```

### Pattern 2: Layout Breakpoints via Custom Hook

**What:** 터미널 크기를 3단계 breakpoint로 분류, 컴포넌트에 layout prop 전달
**When to use:** 동일 컴포넌트가 터미널 크기에 따라 다른 레이아웃 사용
**Trade-offs:** 단순한 3단계 분류는 대부분의 케이스를 커버. CSS media query처럼 세밀하지 않지만 TUI에서는 충분.

```typescript
// WelcomeSection.tsx
function WelcomeSection({ layout, ... }) {
  if (layout === 'wide') {
    return (
      <Box flexDirection="row">
        <Box flexDirection="column" width="60%">
          <AsciiBanner />
          <ProfileCard ... />
        </Box>
        <Box flexDirection="column" width="40%">
          <TipsPanel ... />
        </Box>
      </Box>
    );
  }
  // normal/compact: single column
  return (
    <Box flexDirection="column">
      <AsciiBanner />
      <ProfileCard ... />
      {layout !== 'compact' && <TipsPanel ... />}
    </Box>
  );
}
```

### Pattern 3: Step Indicator Component (Reusable)

**What:** 온보딩 등 multi-step flow에서 진행 상태 시각화
**When to use:** 2개 이상 순차 step이 있는 UI
**Trade-offs:** 매우 작은 컴포넌트지만 재사용 가능 (향후 설정 wizard 등)

```typescript
// components/StepIndicator.tsx
function StepIndicator({ current, total }: { current: number; total: number }) {
  const dots = Array.from({ length: total }, (_, i) =>
    i + 1 === current ? '\u25CF' : '\u25CB'
  ).join('\u2500\u2500\u2500');
  return <Text dimColor>{dots}</Text>;
}
```

## Integration Points

### New Components to Existing Architecture

| Integration | Approach | Risk |
|-------------|----------|------|
| WelcomeSection <-> ChatScreen | 조건부 렌더링, 기존 props 재사용 | LOW — 기존 data flow 변경 없음 |
| useTerminalSize <-> ChatScreen | 기존 `useStdout` 대체 | LOW — 현재도 `stdout.columns/rows` 사용 중 |
| OnboardingScreen 개선 | 내부 UI만 변경, Props 동일 | LOW — App.tsx 변경 불필요 |
| WelcomeBack 제거 <-> App.tsx | `showWelcomeBack` state 제거 | LOW — 단순 삭제 |
| StatusBar responsive | layout prop 추가 | LOW — 기존 동작에 fallback |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| ChatScreen -> WelcomeSection | Props (identity, status, counts, layout) | 단방향, 이벤트 불필요 |
| ChatScreen -> useTerminalSize | Hook return value | ChatScreen이 현재 직접 하는 `stdout.columns/rows` 접근을 hook으로 추출 |
| WelcomeSection -> ProfileCard | Props subset (identity, connectionStatus) | 순수 presentational |
| WelcomeSection -> TipsPanel | Props (layout) | 순수 presentational |

## Recommended Build Order

의존성 기반 순서:

```
Phase 1: useTerminalSize hook + shared constants
  └── 다른 모든 responsive 컴포넌트가 의존
  └── MIN_TERMINAL_WIDTH (60) 이미 shared/constants.ts에 존재
  └── 새 breakpoint 상수 추가: COMPACT_WIDTH=80, WIDE_WIDTH=120

Phase 2: OnboardingScreen UI 개선
  └── useTerminalSize에 의존하지 않음 (독립적)
  └── StepIndicator 컴포넌트 추출
  └── welcome step 단순화 또는 제거
  └── Box borderStyle 적용

Phase 3: WelcomeSection + 하위 컴포넌트
  └── useTerminalSize 의존
  └── ProfileCard, TipsPanel 신규 작성
  └── ChatScreen에 조건부 렌더링 통합
  └── App.tsx에서 WelcomeBack splash 제거

Phase 4: StatusBar + 전체 responsive 적용
  └── useTerminalSize를 ChatScreen 전체에 적용
  └── StatusBar compact mode
  └── overlayHeight 계산에 rows 반영 확인
```

**Phase 1은 반드시 먼저** — 다른 phase에서 layout breakpoint를 사용.
**Phase 2는 독립적** — Phase 1과 병렬 가능하지만, 순차 실행이 안전.
**Phase 3이 핵심** — 가장 큰 변경, 가장 높은 가치.
**Phase 4는 마무리** — Phase 3 이후 자연스럽게 적용.

## Anti-Patterns

### Anti-Pattern 1: WelcomeSection을 별도 Screen으로 만들기

**What people do:** `LobbyScreen` -> `ChatScreen` 전환하는 새 screen 레벨 추가
**Why it's wrong:** ChatScreen의 connection hooks가 LobbyScreen에서도 필요 -> 상태 공유 복잡. 메시지 수신 시 screen 전환 = unmount/remount로 깜빡임.
**Do this instead:** ChatScreen 내부에서 `isLobby` 조건으로 영역 교체.

### Anti-Pattern 2: setTimeout으로 splash/animation 구현

**What people do:** `setTimeout(() => setState(...), N)` — 현재 WelcomeBack이 이 패턴
**Why it's wrong:** React render 중 side effect, cleanup 없음, strict mode에서 double-fire
**Do this instead:** `useEffect` + cleanup으로 timer 관리. 또는 splash 자체를 제거하고 정보성 UI로 대체.

### Anti-Pattern 3: Inline breakpoint 조건 분산

**What people do:** 각 컴포넌트에서 `columns > 120 ? ... : ...` 직접 비교
**Why it's wrong:** Breakpoint 기준값이 코드 전체에 분산 -> 변경 시 누락 위험
**Do this instead:** `useTerminalSize` hook에서 `layout` enum 반환, 컴포넌트는 layout만 참조.

### Anti-Pattern 4: figlet 동적 폰트 로딩

**What people do:** Runtime에 여러 figlet 폰트를 조건부 로드
**Why it's wrong:** figlet 폰트는 각각 ~50KB, bundle size 증가. 현재 `Standard` 폰트 하나만 사용 중.
**Do this instead:** 현재처럼 단일 폰트 module-level 초기화 유지. 폰트 변경 필요 없음.

## File Structure (New/Modified)

```
packages/client/src/
├── hooks/
│   ├── useTerminalSize.ts          # NEW — resize 감지 + breakpoint
│   ├── useServerConnection.ts      # unchanged
│   ├── useNearbyUsers.ts           # unchanged
│   ├── useChatSession.ts           # unchanged
│   ├── useFriends.ts               # unchanged
│   └── useGracefulExit.ts          # unchanged
├── ui/
│   ├── App.tsx                     # MODIFY — WelcomeBack splash 제거
│   ├── theme.ts                    # unchanged
│   ├── screens/
│   │   ├── OnboardingScreen.tsx    # MODIFY — UI 개선
│   │   └── ChatScreen.tsx          # MODIFY — WelcomeSection 통합, useTerminalSize
│   └── components/
│       ├── WelcomeSection.tsx      # NEW — lobby 상태 메인 UI
│       ├── ProfileCard.tsx         # NEW — 프로필 정보 카드
│       ├── TipsPanel.tsx           # NEW — 사용 팁 패널
│       ├── StepIndicator.tsx       # NEW — multi-step 진행 표시
│       ├── AsciiBanner.tsx         # unchanged
│       ├── StatusBar.tsx           # MODIFY — compact mode
│       ├── MessageArea.tsx         # unchanged
│       ├── IMETextInput.tsx        # unchanged
│       └── ...                     # other existing components unchanged
└── packages/shared/src/
    └── constants.ts                # MODIFY — breakpoint 상수 추가
```

## Sources

- Ink 6 `useStdout` hook: `stdout.on('resize')` 이벤트로 터미널 크기 변화 감지 가능 (Node.js `process.stdout` resize event)
- 기존 코드 분석: `packages/client/src/ui/screens/ChatScreen.tsx:42-44` — 이미 `useStdout()`로 `rows`/`columns` 사용 중
- 기존 코드 분석: `packages/client/src/ui/App.tsx:16-17` — `setTimeout` in render, React anti-pattern 확인
- 기존 코드 분석: `packages/client/src/ui/screens/ChatScreen.tsx:84` — `overlayHeight` 기반 동적 높이 계산 패턴 이미 존재
- `packages/shared/src/constants.ts:4` — `MIN_TERMINAL_WIDTH = 60` 이미 정의됨

---
*Architecture research for: HiveChat v1.4 UI/UX Polish*
*Researched: 2026-03-21*
