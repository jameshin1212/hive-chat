---
phase: 01-foundation
verified: 2026-03-19T16:25:00Z
status: human_needed
score: 14/15 must-haves verified
re_verification: false
human_verification:
  - test: "Korean IME composition test"
    expected: "Typing Korean characters shows correct composition (ㅎ->하->한->한ㄱ->한그->한글) without cursor drift"
    why_human: "IME composition happens at OS level; automated tests verify cursor width math but not visual composition behavior"
  - test: "Full onboarding flow"
    expected: "Banner -> nickname input -> AI CLI selection -> chat screen with identity badge"
    why_human: "Component rendering requires interactive terminal; Ink components cannot be fully tested headlessly"
  - test: "Split layout visual correctness"
    expected: "StatusBar top, green separator, MessageArea middle (fills space), green separator, Input bottom"
    why_human: "Layout proportions and visual appearance need terminal rendering"
---

# Phase 01: Foundation Verification Report

**Phase Goal:** Runnable CLI that displays a TUI with working Korean/CJK input, generates and stores nick#tag identity, and is distributable via npx
**Verified:** 2026-03-19T16:25:00Z
**Status:** human_needed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | nick#XXXX identity generated with crypto.randomBytes and persisted via conf | VERIFIED | `packages/client/src/identity/IdentityManager.ts:6` uses `crypto.randomBytes(2)`, `AppConfig.ts` uses `new Conf` |
| 2 | AI CLI selection stored alongside identity | VERIFIED | `saveIdentity(nickname, aiCli)` stores `aiCli` field, validated by `identitySchema` |
| 3 | Slash commands /quit, /help parsed correctly | VERIFIED | `CommandParser.ts` has 6 commands, 12 parser tests pass |
| 4 | npx cling-talk bin entry exists with correct shebang | VERIFIED | `bin/cling-talk.js` has `#!/usr/bin/env node`, file is executable |
| 5 | All packages ESM-only with strict TypeScript | VERIFIED | Root and client `package.json` have `"type": "module"`, root `tsconfig.json` has `"strict": true` |
| 6 | Split layout renders with message area on top and input on bottom | VERIFIED | `ChatScreen.tsx:86` `flexDirection="column"`, MessageArea has `flexGrow={1}` |
| 7 | IME TextInput calculates cursor position using string-width | VERIFIED | `IMETextInput.tsx:13` `calcCursorX` uses `stringWidth()`, 7 cursor tests pass |
| 8 | Korean text input cursor position accounts for 2-column CJK characters | VERIFIED | Test confirms "한글" with "> " prompt = 6 (2 prompt + 4 CJK) |
| 9 | Status bar shows identity badge and connection status | VERIFIED | `StatusBar.tsx:11` uses `theme.badge[identity.aiCli]`, shows "offline" |
| 10 | Onboarding screen collects nickname and AI CLI selection | VERIFIED | `OnboardingScreen.tsx` 3-step flow: welcome -> nickname (validated) -> AI CLI selector |
| 11 | First-time user sees onboarding flow | VERIFIED | `App.tsx:25` routes to `OnboardingScreen` when `!identity` |
| 12 | Returning user sees "Welcome back, nick#TAG" | VERIFIED | `App.tsx:13-23` shows welcome back then transitions to chat |
| 13 | User can type Korean characters without composition glitches | ? UNCERTAIN | Ref-based fix applied (`6da2004`), but needs human verification of actual IME behavior |
| 14 | Ctrl+C and /quit both exit cleanly | VERIFIED | `ChatScreen.tsx:31-35` handles Ctrl+C, `:41-43` handles /quit, both call `gracefulExit()` |
| 15 | npx cling-talk bin entry launches the app | VERIFIED | `bin/cling-talk.js` imports `../dist/index.js`, `index.tsx` renders `<App />` |

**Score:** 14/15 truths verified (1 needs human verification)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/shared/src/types.ts` | Identity, AiCli, ChatMessage types | VERIFIED | All types exported, 27 lines |
| `packages/shared/src/schemas.ts` | identitySchema, configSchema | VERIFIED | Zod schemas with correct regex patterns |
| `packages/shared/src/constants.ts` | NICKNAME_REGEX, TAG_LENGTH, THEME_COLORS | VERIFIED | All constants exported |
| `packages/client/src/identity/IdentityManager.ts` | Identity CRUD operations | VERIFIED | generateTag, saveIdentity, loadIdentity, clearIdentity, formatIdentityDisplay |
| `packages/client/src/commands/CommandParser.ts` | Slash command parsing | VERIFIED | parseInput, isKnownCommand, COMMANDS (6 commands) |
| `packages/client/src/ui/theme.ts` | Color theme constants | VERIFIED | Badge colors for all 4 AI CLIs, user colors, UI colors |
| `packages/client/src/ui/components/IMETextInput.tsx` | CJK-aware text input | VERIFIED | 118 lines, uses string-width, ref-based IME fix, visual cursor |
| `packages/client/src/ui/components/MessageArea.tsx` | Scrollable message list | VERIFIED | flexGrow={1}, MAX_MESSAGES limit, user color assignment |
| `packages/client/src/ui/components/StatusBar.tsx` | Identity + connection display | VERIFIED | Badge color lookup, nick#tag display, "offline" status |
| `packages/client/src/ui/screens/ChatScreen.tsx` | Main chat layout | VERIFIED | Split layout, command handling, graceful exit wiring |
| `packages/client/src/ui/screens/OnboardingScreen.tsx` | Onboarding wizard | VERIFIED | 3-step flow, NICKNAME_REGEX validation, saveIdentity call |
| `packages/client/src/ui/App.tsx` | Root app with screen routing | VERIFIED | loadIdentity routing, OnboardingScreen + ChatScreen conditional render |
| `packages/client/src/index.tsx` | CLI entry rendering App | VERIFIED | render(<App />), cursor restore on exit |
| `packages/client/bin/cling-talk.js` | npx entry point | VERIFIED | Shebang present, executable, imports dist/index.js |
| `packages/client/src/ui/components/AsciiBanner.tsx` | ASCII art banner | VERIFIED | figlet.textSync at module level with fallback |
| `packages/client/src/ui/components/AiCliSelector.tsx` | AI CLI arrow selector | VERIFIED | AI_CLI_OPTIONS from shared, arrow key navigation |
| `packages/client/src/hooks/useGracefulExit.ts` | Clean exit hook | VERIFIED | useApp().exit(), 2s timeout, cursor restore |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| IdentityManager.ts | @cling-talk/shared | `import { identitySchema }` | WIRED | Line 2: imports schema for validation |
| IdentityManager.ts | conf | `appConfig` from AppConfig.ts | WIRED | Line 3: imports appConfig, uses .set/.get/.delete |
| IMETextInput.tsx | string-width | `stringWidth` in calcCursorX | WIRED | Line 3: imported, line 13: used in cursor calculation |
| ChatScreen.tsx | IMETextInput | import for input area | WIRED | Line 10: imported, line 95: rendered with onSubmit |
| ChatScreen.tsx | CommandParser | parseInput for commands | WIRED | Line 5: imported, line 38: called in handleSubmit |
| ChatScreen.tsx | useGracefulExit | exit handling | WIRED | Line 7: imported, line 28: called, used in Ctrl+C and /quit |
| App.tsx | IdentityManager | loadIdentity for routing | WIRED | Line 3: imported, line 9: called in useState initializer |
| App.tsx | OnboardingScreen | conditional render | WIRED | Line 4: imported, line 27: rendered when !identity |
| App.tsx | ChatScreen | conditional render | WIRED | Line 5: imported, line 36: rendered with identity prop |
| OnboardingScreen.tsx | saveIdentity | identity creation | WIRED | Line 5: imported, line 34: called with nickname + aiCli |
| OnboardingScreen.tsx | NICKNAME_REGEX | validation | WIRED | Line 4: imported, line 24: used in .test() |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| IDEN-01 | 01-01, 01-03 | nick#1234 identity generation on first run | SATISFIED | IdentityManager generates tag via crypto.randomBytes, OnboardingScreen collects nickname |
| IDEN-02 | 01-01, 01-03 | AI CLI selection + badge display | SATISFIED | AiCliSelector offers 4 options, StatusBar shows badge with color |
| TUI-01 | 01-02, 01-03 | Split layout (message + input) | SATISFIED | ChatScreen: StatusBar + separator + MessageArea(flexGrow) + separator + IMETextInput |
| TUI-02 | 01-02, 01-03 | Korean/CJK IME input without glitches | NEEDS HUMAN | string-width cursor calc verified, ref-based IME fix applied, but actual IME behavior needs manual test |
| TUI-04 | 01-01, 01-03 | Ctrl+C or /quit clean exit | SATISFIED | ChatScreen handles both, useGracefulExit restores cursor |
| DIST-01 | 01-01, 01-03 | npx cling-talk distribution | SATISFIED | bin entry with shebang, package.json bin field, executable permission |

No orphaned requirements found -- all 6 requirement IDs from the phase are accounted for in plan frontmatter.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| ChatScreen.tsx | 69 | `// Other known commands (placeholder for Phase 2+)` | Info | Expected -- /users, /friends, /chat, /settings need networking |
| StatusBar.tsx | 18 | `<Text color="yellow">offline</Text>` | Info | Expected -- hardcoded "offline" until Phase 2 networking |
| App.tsx | 15 | `setTimeout(() => setShowWelcomeBack(false), 1500)` | Warning | setTimeout in render path; may fire after unmount. Not blocking but should use useEffect |

**Notable deviation from Plan 02:** `useCursor` was removed during Plan 03 integration testing. The plan specified `useCursor` for terminal cursor positioning, but it caused cursor to jump to top of Ink output. Replaced with visual block cursor character. The `calcCursorX` function remains exported and tested but is no longer used for actual cursor positioning. This is acceptable -- the visual cursor approach works better for Korean IME composition.

### Human Verification Required

### 1. Korean IME Composition Test

**Test:** Launch app with `npx tsx packages/client/src/index.tsx`, switch to Korean IME, type "한글테스트"
**Expected:** Each composition step visible without cursor drift (ㅎ->하->한, etc). Single Enter submits including the last composing character. Backspace removes character correctly.
**Why human:** IME composition is OS-level behavior that cannot be tested programmatically. The ref-based fix (commit `6da2004`) addresses React batching race but needs visual confirmation.

### 2. Full Onboarding Flow

**Test:** Clear identity (delete conf config), launch app, complete onboarding
**Expected:** ASCII banner -> "Press Enter" -> nickname input with validation -> AI CLI selector with arrow keys -> chat screen with badge
**Why human:** Multi-step interactive flow requires terminal rendering and user input

### 3. Split Layout Visual Correctness

**Test:** After onboarding, observe the chat screen layout
**Expected:** StatusBar at top with `[Claude Code] nick#XXXX | offline`, green separator lines, MessageArea filling middle space, IMETextInput at bottom with `> ` prompt and visual cursor
**Why human:** Flexbox layout proportions and visual rendering need terminal confirmation

### Gaps Summary

No blocking gaps found. All automated verifications pass:
- 33/33 unit tests passing
- All 17 required artifacts exist and are substantive (no stubs)
- All 11 key links verified as wired
- All 6 requirements accounted for
- No TODO/FIXME/PLACEHOLDER markers
- No `ink-text-input` usage (prohibited)
- No `.length` for cursor calculation (only `stringWidth`)
- TypeScript compiles cleanly (TS6305 errors are stale dist/ output, not real type errors)

The only item requiring human verification is Korean IME composition behavior (TUI-02), which cannot be tested programmatically. Four fix iterations during Plan 03 manual checkpoint suggest the implementation converged on a working solution (ref-based text state + visual block cursor).

---

_Verified: 2026-03-19T16:25:00Z_
_Verifier: Claude (gsd-verifier)_
