# Feature Research: v1.4 UI/UX Polish

**Domain:** CLI onboarding, welcome screens, responsive terminal layouts
**Researched:** 2026-03-21
**Confidence:** HIGH (existing codebase + well-documented Ink patterns)

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist when a CLI tool has "polish." Missing = product feels unfinished.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Version display on startup** | Every polished CLI shows version. Users need it for bug reports and updates. | LOW | `package.json` version -> welcome section. Currently hardcoded as `v0.1.0` in system message -- needs dynamic version. |
| **Profile summary on connect** | After setup, users expect to see their identity confirmed. Claude Code shows model info + context on startup. | LOW | Show `nickname#tag`, AI CLI badge, connection status. Data already available in `StatusBar`. |
| **Terminal resize reflow** | Ink 3+ auto-rerenders on resize. Users expect layout to adapt without restart. | MEDIUM | `useStdout()` already used in `ChatScreen.tsx:43-44` for rows/columns. Separator already reflows. Main gap: no breakpoint-based layout changes. |
| **Minimum terminal size handling** | Tools shouldn't crash or render garbage on small terminals. CLAUDE.md specifies min 60 columns. | LOW | Show warning/degraded layout below threshold. Currently no guard. |
| **Onboarding step indicator** | Multi-step setup without progress indication feels uncertain. Users don't know how many steps remain. | LOW | Current flow: welcome -> nickname -> ai-cli (3 steps). Add `Step 1/2` or progress dots. |
| **Input validation feedback** | Immediate, clear error for invalid input. | LOW | Already exists for nickname (`OnboardingScreen.tsx:24-26`). Polish: inline hint style improvement. |
| **Keyboard shortcut hints in context** | Users need to know Tab=users, /help=commands without memorizing docs. | LOW | Currently shown once as system message on connect (`ChatScreen.tsx:117`). Should be persistent in welcome section. |

### Differentiators (Competitive Advantage)

Features that elevate HiveChat from "functional" to "delightful." Inspired by Claude Code, lazygit, gh CLI.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Claude Code-style welcome section** | Rich info panel on startup: ASCII art + version + profile + tips. Sets professional tone, matches target audience's mental model (they use Claude Code daily). | MEDIUM | Replace current 1.5s "Welcome back" setTimeout screen (`App.tsx:17`) with persistent welcome section in message area. Show until first interaction or connection established. |
| **Contextual tips rotation** | Tips that change each session or rotate periodically. "Did you know? Tab shows nearby users" style. Teaches features progressively without reading docs. | LOW | Array of tip strings, random selection per session. Low effort, high discovery value. |
| **Animated connection state** | Spinner/dots during "connecting..." instead of static text. Visual feedback that something is happening. | LOW | Ink `ink-spinner` package. Subtle but polished. |
| **Responsive side panel (wide terminals)** | On terminals >120 cols, show side panel with recent activity, tips, or friend list. Claude Code does this with context panel. | HIGH | Requires flex layout rework. Only valuable on wide terminals. |
| **Onboarding with visual flair** | Styled step transitions, color-coded sections, box-drawing borders around input fields. | MEDIUM | Use Ink `<Box borderStyle="round">` for input sections. `TransitionLine.tsx` already exists -- extend pattern. |
| **Adaptive ASCII banner** | Smaller/simpler banner on narrow terminals, full banner on wide. | LOW | Check columns in `AsciiBanner.tsx`, use figlet `Standard` for wide, plain text for narrow (<80 cols). |
| **Welcome section dismiss on first message** | Welcome info stays visible until user sends first message or starts chat, then fades to make room for conversation. | LOW | State flag in ChatScreen, clear welcome section on first `handleSubmit`. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Full-screen animated splash** | "Looks cool" like neofetch/fastfetch | Delays time-to-interactive. CLI users hate waiting. Current 1.5s setTimeout already too long for power users. | Instant welcome section integrated into main layout, no blocking animation. |
| **Mouse-driven onboarding** | GUI habits carry over | CLAUDE.md: "mouse events for core features forbidden." Terminal mouse support inconsistent. Breaks tmux/screen. | Keyboard-only with clear arrow/enter indicators. |
| **Persistent tutorial overlay** | "Users need to learn features" | Covers actual content. Power users dismiss immediately. Feels patronizing after first run. | Contextual tips in welcome section + `/help` command (already exists). |
| **Custom theme/color picker in onboarding** | Personalization desire | Scope creep. 2 input steps is already optimal for onboarding. Theme config adds complexity. | Defer to `/settings` or future milestone. |
| **Auto-playing demo/walkthrough** | "Show what the app can do" | Terminal animations are janky. Can't be skipped cleanly. Feels like a website tutorial. | Static tips + first-use hints that appear contextually. |
| **Multi-page onboarding with back/forward** | "Let users review choices" | Over-engineering for 2 input steps (nickname + AI CLI). Navigation adds state complexity. | `/settings` already allows changing any choice post-onboarding. |
| **Rich media in terminal (images/links)** | "Modern terminals support it" | iTerm2-only for images. Links inconsistent across terminals. Violates cross-terminal compat requirement. | ASCII art + text-only. URLs as plain text (terminal auto-detects clickability). |

## Feature Dependencies

```
[Version display] (standalone, no deps)

[Terminal resize detection]
    |-- already exists (useStdout)
    |
    +--requires--> [Responsive breakpoints]
                       |
                       +--enables--> [Adaptive ASCII banner]
                       +--enables--> [Side panel (wide terminals)]
                       +--enables--> [Minimum terminal size warning]

[Welcome section]
    |
    +--requires--> [Version display]
    +--requires--> [Profile summary]
    +--enhances--> [Tips rotation]
    +--requires--> [Welcome dismiss on interaction]

[Onboarding UI polish]
    |
    +--requires--> [Step indicator]
    +--enhances--> [Adaptive ASCII banner]
    +--independent-of--> [Welcome section] (different screens)

[Animated connection state]
    |-- independent, can add anytime
```

### Dependency Notes

- **Welcome section requires version display:** Version is a core element of the welcome panel. Must read from package.json dynamically.
- **Responsive breakpoints require resize detection:** Already have `useStdout` -- need to define breakpoint constants (narrow <80, normal 80-120, wide >120).
- **Onboarding is independent of welcome section:** Onboarding = first-run only (`OnboardingScreen.tsx`). Welcome section = every launch (`ChatScreen.tsx`/`App.tsx`). Different code paths, can be built in parallel.
- **Side panel conflicts with overlay system:** Current overlays (UserList, FriendList, Settings) use height subtraction from MessageArea (`ChatScreen.tsx:66-83`). Side panel would need horizontal split, requiring layout rearchitecture. Defer to v1.5+.

## MVP Definition (v1.4 Scope)

### Must Have (v1.4)

- [ ] **Welcome section with version + profile + tips** -- Core deliverable, replaces empty message area on startup
- [ ] **Dynamic version display** -- Replace hardcoded `v0.1.0` with actual package version
- [ ] **Responsive breakpoints** -- Define narrow/normal/wide constants, adapt layout per breakpoint
- [ ] **Minimum terminal size warning** -- Guard for <60 col terminals per CLAUDE.md spec
- [ ] **Adaptive ASCII banner** -- Full figlet on wide, simplified on narrow
- [ ] **Onboarding step indicator** -- Step 1/2 or progress dots

### Add If Time Permits (v1.4)

- [ ] **Onboarding visual polish** -- Box borders around input fields, colored step headers
- [ ] **Contextual tips rotation** -- Random tip per session from curated list
- [ ] **Welcome dismiss on first interaction** -- Welcome section clears when user engages
- [ ] **Animated connection spinner** -- ink-spinner during connecting/reconnecting states

### Defer (v1.5+)

- [ ] **Responsive side panel** -- HIGH complexity layout rework, only benefits wide terminal users
- [ ] **Onboarding animations/transitions** -- Diminishing returns on a 2-step flow
- [ ] **Theme customization** -- Out of scope for this milestone

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Welcome section (version/profile/tips) | HIGH | MEDIUM | P1 |
| Dynamic version display | HIGH | LOW | P1 |
| Responsive breakpoints | HIGH | MEDIUM | P1 |
| Minimum terminal size warning | MEDIUM | LOW | P1 |
| Adaptive ASCII banner | MEDIUM | LOW | P1 |
| Onboarding step indicator | MEDIUM | LOW | P1 |
| Contextual tips rotation | MEDIUM | LOW | P2 |
| Onboarding visual polish (borders) | MEDIUM | MEDIUM | P2 |
| Welcome dismiss on interaction | LOW | LOW | P2 |
| Animated connection spinner | LOW | LOW | P2 |
| Responsive side panel | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have -- core deliverables of v1.4
- P2: Should have -- polish that enhances v1.4 if time permits
- P3: Nice to have -- defer to future milestone

## Competitor Feature Analysis

| Feature | Claude Code | gh CLI | lazygit | HiveChat (current) | HiveChat (v1.4 target) |
|---------|-------------|--------|---------|---------------------|------------------------|
| Version on startup | Yes, model + version | `gh --version` only | Yes, in status bar | Hardcoded `v0.1.0` in system msg | Dynamic version in welcome section |
| ASCII art/branding | Gradient banner | None | None | figlet `HIVECHAT` | Adaptive figlet (wide/narrow) |
| Profile info on start | Model, context, project | Logged-in user | Git repo info | 1.5s "Welcome back" flash | Persistent profile panel |
| Tips/shortcuts | Contextual help panel | `--help` flag | Keybinding cheat sheet | System message on connect | Rotating tips in welcome section |
| Onboarding | API key setup wizard | `gh auth login` (interactive) | N/A | 3-step (welcome/nick/cli) | Polished 2-step with progress indicator |
| Responsive layout | Adapts to terminal width | Fixed width output | Panel-based, responsive | Fixed layout, separator reflows | Breakpoint-based adaptation |
| Min terminal guard | Graceful degradation | N/A | Warning on small terminals | None | Warning + degraded layout |

## Implementation Notes

### Existing Code Touchpoints

1. **`App.tsx:15-27`** -- Welcome back screen with 1.5s setTimeout: Replace with proper welcome section that persists until dismissed
2. **`OnboardingScreen.tsx`** -- Add step indicator, visual borders around input
3. **`ChatScreen.tsx:43-44`** -- Already reads `rows`/`columns` via useStdout: Add breakpoint logic
4. **`ChatScreen.tsx:113-117`** -- Hardcoded version string and tips in system message: Move to welcome section component
5. **`AsciiBanner.tsx`** -- Add columns parameter for adaptive sizing (figlet vs plain text)
6. **`StatusBar.tsx`** -- Already has all profile data needed for welcome section (identity, connection, transport)
7. **`theme.ts`** -- May need additional color tokens for welcome section borders/headers

### Breakpoint Definitions (Recommended)

```
NARROW:  < 80 columns  -- Hide ASCII banner, compact tips, single-line status
NORMAL:  80-120 columns -- Full ASCII banner, tips section, standard layout
WIDE:    > 120 columns  -- Side panel space available (v1.5+)

MIN_HEIGHT: 16 rows    -- Minimum usable height
MIN_WIDTH:  60 columns -- Per CLAUDE.md specification
```

### Version Resolution Strategy

Read version from `package.json` at build time via tsdown `define` plugin or environment variable injection. Avoids filesystem reads at runtime and works correctly with bundled CLI distribution. Alternative: `createRequire` to read package.json, but build-time is cleaner for a single-file bundle.

### Welcome Section Structure (Recommended)

```
+------------------------------------------+
|  HIVECHAT                    v1.4.0       |
|                                           |
|  jamie#a3f2  [Claude Code]  connected     |
|  3 nearby  |  Friends: 1/2 online         |
|                                           |
|  Tip: Press Tab to see nearby users       |
+------------------------------------------+
```

On narrow terminals (<80 cols), collapse to:

```
HIVECHAT v1.4.0
jamie#a3f2 [Claude Code] connected
Tip: Tab = nearby users
```

## Sources

- [Ink GitHub - React for CLI apps](https://github.com/vadimdemedes/ink) -- useStdout, flexbox layout, auto-rerender on resize
- [UX patterns for CLI tools](https://www.lucasfcosta.com/blog/ux-patterns-cli-tools) -- onboarding, color usage, progressive disclosure
- [Ink TUI: Building Expandable Layouts](https://combray.prose.sh/2025-11-28-ink-tui-expandable-layout) -- fixed footer patterns, layout metrics
- [Creating responsive CLI layouts](https://app.studyraid.com/en/read/11921/379932/creating-responsive-cli-layouts) -- useStdoutDimensions, breakpoint patterns
- [ink-use-stdout-dimensions](https://www.npmjs.com/package/ink-use-stdout-dimensions) -- terminal resize hook
- [3 steps to create awesome CLI UX](https://opensource.com/article/22/7/awesome-ux-cli-application) -- onboarding best practices
- Existing codebase analysis: `OnboardingScreen.tsx`, `App.tsx`, `ChatScreen.tsx`, `AsciiBanner.tsx`, `StatusBar.tsx`

---
*Feature research for: v1.4 UI/UX Polish*
*Researched: 2026-03-21*
