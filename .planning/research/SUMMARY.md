# Project Research Summary

**Project:** Double Talk
**Domain:** CLI P2P Chat with Location-Based Discovery
**Researched:** 2026-03-19
**Confidence:** MEDIUM-HIGH

## Executive Summary

Double Talk is a terminal-native P2P chat tool that combines location-based user discovery with developer-focused identity (AI CLI tool badges). The product occupies a unique niche -- no existing tool combines CLI-native chat, IP geolocation discovery, and P2P messaging. The recommended approach uses a hybrid architecture: a lightweight signaling server (ws + geoip-lite) handles user registration, presence, and location-based discovery, while Hyperswarm provides encrypted P2P connections for actual messaging. Ink (React for CLI) is the TUI framework of choice due to CJK IME support hooks and Flexbox layout. The entire project should be ESM-only, TypeScript strict, organized as a monorepo with client/server/shared packages.

The critical technical risks are threefold. First, Korean/CJK IME composition in terminal raw mode is a known hard problem -- characters become invisible during composition. This is documented across multiple Ink-based tools (Claude Code, Gemini CLI) and must be validated in the first week before building any chat features on top. Second, P2P NAT traversal fails for 15-30% of users behind symmetric NATs or CGNAT, so the architecture must include a relay fallback from day one. Third, IP geolocation is only 40-75% accurate at city level, so "nearby" should mean "same metro area" (10km+ radius), not precise proximity.

The strongest strategic recommendation is to start with relay-based messaging and upgrade to P2P later. This means a working chat app exists after Phase 3 (before P2P complexity is introduced), de-risking the hardest networking challenge. The ephemeral-by-design messaging (no storage, no logs) is both a simplification and a compelling privacy feature. The AI CLI badge is a low-cost, high-social-value differentiator that should ship in v1.

## Key Findings

### Recommended Stack

The stack centers on three pillars: Ink 6.x for TUI (with React 18), Hyperswarm 4.x for P2P (Noise protocol encryption, UDP hole-punching), and ws 8.x for the signaling server WebSocket layer. TypeScript 5.7+ in strict mode with ESM throughout. Supporting libraries include geoip-lite (server-side IP geolocation without external API calls), zod (P2P message validation against malicious peers), conf (XDG-compliant local config), nanoid (nick#tag generation), and string-width (CJK character width calculation). Build tooling: tsdown (Rolldown-based bundler, successor to tsup) and vitest for testing.

**Core technologies:**
- **Ink 6.x + React 18:** TUI framework -- CJK IME hooks (`useCursor`), Flexbox layout, differential rendering via React reconciliation
- **Hyperswarm 4.x:** P2P layer -- Noise protocol E2E encryption built-in, UDP hole-punching for NAT traversal, topic-based peer discovery
- **ws 8.x:** Signaling server -- lightweight WebSocket, no unnecessary abstractions (unlike socket.io)
- **geoip-lite:** IP geolocation -- local MaxMind GeoLite DB lookup, no external API dependency on server
- **zod 3.x:** Protocol message validation -- defends against malicious peers sending malformed data

**Critical version requirements:** Ink 6.x requires React 18. Project must be `"type": "module"` (ESM-only). Node.js >= 20 LTS.

### Expected Features

**Must have (table stakes):**
- Identity system (nickname#tag, auto-generated, local storage)
- Signaling server (registration, presence, IP exchange)
- IP geolocation + nearby user discovery with configurable radius
- P2P 1:1 chat (or relay fallback)
- TUI with split layout (message area + fixed input bar)
- Multibyte character support (Korean, Japanese, emoji)
- Online/offline presence indicators
- Ephemeral messages (session-only, intentional design)
- AI CLI tool badge display
- Clean exit handling (SIGINT/SIGTERM)

**Should have (v1.x differentiators):**
- Friend system (add by nick#tag, location-independent)
- Terminal bell notifications
- Connection health indicator in status bar
- Color themes

**Defer (v2+):**
- Group chat (multi-party P2P is an order of magnitude harder)
- Code snippet sharing
- Identity export/import
- File transfer, voice/video, rich text (anti-features for this product)

### Architecture Approach

Monorepo with three packages: client (npm-distributed CLI), server (lightweight signaling), and shared (protocol types with zod schemas). The client uses an event-driven internal architecture where TUI, ChatManager, and ConnectionManager communicate via EventEmitter, keeping layers testable and loosely coupled. The server is stateless (in-memory only, no database) handling user registration, geolocation lookup, presence heartbeats, and relay fallback. The key architectural decision is relay-first: start with the signaling server as a message relay in Phase 3, then upgrade to direct P2P via Hyperswarm in Phase 4.

**Major components:**
1. **TUI Layer (Ink)** -- terminal rendering, keyboard input, chat UI with split panes
2. **Connection Manager** -- facade over SignalingClient + PeerConnection, decides transport (relay vs P2P)
3. **Signaling Server** -- WebSocket server for registration, discovery, presence, SDP/ICE exchange, relay fallback
4. **Identity Manager** -- nick#tag generation/storage via conf library
5. **Shared Protocol** -- TypeScript types + zod schemas shared between client and server

### Critical Pitfalls

1. **CJK IME invisible composition** -- Terminal raw mode conflicts with IME multi-stage character formation. Use hybrid approach: raw mode for navigation, cooked mode for message input. Validate with real Korean IME in week 1. Recovery cost is HIGH (full UI rewrite) if wrong library is chosen.

2. **NAT traversal fails for 15-30% of users** -- Design relay fallback into the protocol from the start, not bolted on later. Signaling server doubles as message relay. Fast fallback (3-5 seconds) when direct connection fails. This is why relay-first architecture is recommended.

3. **IP geolocation inaccuracy (25-60% wrong city)** -- Default radius to 10km+, label as "same metro area." Detect VPN/proxy IPs and warn users. Allow manual city override. Do not promise precise proximity.

4. **npx cold start takes 10-30s** -- Zero native dependencies. Bundle into single file with tsdown. Show immediate ASCII banner before async init. Budget: under 5 seconds on broadband.

5. **WebSocket connection silently dies** -- Application-level heartbeat every 15-30s. Exponential backoff reconnection with jitter. TCP keepalive at 30s. Show connection status in TUI.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation (Protocol + Identity + TUI Shell)
**Rationale:** Everything depends on the shared protocol types, identity system, and a working TUI that handles CJK input. The TUI/IME validation is the highest-risk item and must be proven first. Architecture research confirms these have zero external dependencies.
**Delivers:** Runnable CLI that displays a TUI with working Korean input, generates/stores nick#tag identity, and defines the complete message protocol (shared package with zod schemas).
**Addresses:** Identity system, TUI split layout, multibyte input, ephemeral design (no storage layer), clean exit handling, npx cold start optimization
**Avoids:** CJK IME composition pitfall (validated early), terminal compatibility issues (graceful degradation established), npx startup slowness (minimal deps from start)

### Phase 2: Signaling Server + Discovery
**Rationale:** The signaling server is required before any networking. Geolocation integration and presence management are server-side concerns that can be built and tested independently of P2P complexity.
**Delivers:** Running signaling server that accepts WebSocket connections, registers users with geolocation, returns nearby user lists, and manages online/offline presence with heartbeats.
**Uses:** ws, geoip-lite, haversine, zod (shared protocol validation)
**Implements:** SignalingServer, PresenceManager, GeoLocationService components
**Avoids:** IP geolocation inaccuracy pitfall (validate accuracy, set appropriate defaults), connection silent death (heartbeat built into WebSocket layer), IP exposure (server never sends IPs in discovery responses)

### Phase 3: Chat via Relay
**Rationale:** Relay-first approach means a fully working chat app exists before tackling P2P complexity. The signaling server already has WebSocket connections to both peers, so adding message relay is straightforward. This delivers the core product value with minimal additional risk.
**Delivers:** End-to-end chat flow: discover nearby user, initiate chat, exchange messages via server relay. Full TUI with message display, input, user list, AI CLI badges.
**Addresses:** 1:1 direct messaging (via relay), nearby user discovery UX, online/offline presence display, AI CLI tool badge, configurable discovery radius
**Avoids:** NAT traversal failure (relay always works), message delivery uncertainty (server confirms delivery)

### Phase 4: P2P Upgrade (Hyperswarm)
**Rationale:** With chat already working via relay, P2P is a transparent upgrade to reduce server load and add E2E encryption. ConnectionManager abstracts the transport, so the UI layer is unaffected. Hyperswarm provides Noise protocol encryption automatically.
**Delivers:** Direct P2P messaging for users where NAT traversal succeeds. Automatic fallback to relay when it fails. E2E encryption via Noise protocol. Connection health indicator in UI.
**Uses:** Hyperswarm, protomux, b4a
**Implements:** PeerConnection, ConnectionManager relay-to-P2P switching
**Avoids:** NAT traversal failure (relay fallback already works from Phase 3), symmetric NAT hang (fast 3-5s timeout to relay)

### Phase 5: Social Features
**Rationale:** Friend system and polish features build on the stable chat foundation. Friends require identity resolution through the signaling server and P2P connections across non-local networks, which are available after Phase 4.
**Delivers:** Friend add/remove by nick#tag, friend online status tracking, remote friend chat (not location-dependent), terminal notifications, color themes.
**Addresses:** Friend system, terminal notifications, color themes, connection health UI
**Avoids:** No abuse mechanism (block list implemented here)

### Phase Ordering Rationale

- **Phase 1 before all else:** The CJK IME pitfall has the highest recovery cost (full UI rewrite). Validating it first prevents wasted effort on all subsequent phases.
- **Phase 2 before Phase 3:** Chat requires signaling. Signaling can be tested independently with mock clients.
- **Phase 3 before Phase 4:** Relay-first de-risks P2P. A working chat app exists at Phase 3 completion, even if P2P is never added. This is the architecture research's strongest recommendation.
- **Phase 4 before Phase 5:** Friends need P2P across different networks. Hyperswarm NAT traversal must work before remote friend connections make sense.
- **Phase 5 last:** Social features are enhancements, not core value. They depend on everything else being stable.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1:** CJK IME handling in Ink requires prototype validation. Check Ink's `examples/cursor-ime` and test with Korean/Japanese IME. Sparse documentation, real-world issues documented in GitHub issues only.
- **Phase 4:** Hyperswarm integration patterns have limited documentation outside Holepunch ecosystem. protomux documentation is sparse. May need to reference PCChat and other Hyperswarm chat implementations for practical patterns.

Phases with standard patterns (skip research-phase):
- **Phase 2:** WebSocket signaling server is a well-documented pattern. geoip-lite has straightforward API. Haversine distance calculation is standard.
- **Phase 3:** Relay messaging through WebSocket is trivial -- just forward messages between connected clients. Chat TUI with Ink follows standard React patterns.
- **Phase 5:** Friend system is standard CRUD + presence subscription. No novel technical challenges.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Ink, Hyperswarm, ws all actively maintained with strong npm download numbers. Version compatibility verified. |
| Features | MEDIUM-HIGH | Clear competitor analysis establishes table stakes. No direct competitor in this niche validates the concept but means less prior art to reference. |
| Architecture | MEDIUM | Relay-first approach is sound but the Hyperswarm integration pattern (Phase 4) has less documentation. The monorepo structure and event-driven internal architecture are well-established patterns. |
| Pitfalls | HIGH | All critical pitfalls backed by real GitHub issues, accuracy studies, and documented NAT traversal research. Recovery costs are well-understood. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **Ink CJK IME actual behavior:** Research documents the problem and theoretical solutions, but no confirmed working implementation exists for Ink 6.x with Korean IME. Must prototype and validate in Phase 1 planning. If Ink fails, terminal-kit is the backup but requires re-evaluating the entire TUI approach.
- **Hyperswarm + custom signaling server coexistence:** STACK.md recommends Hyperswarm for P2P but ARCHITECTURE.md proposes WebRTC DataChannel. The recommended path is Hyperswarm (per STACK.md) since it provides built-in encryption and NAT traversal without native binary dependencies (unlike node-datachannel). This architectural decision should be confirmed during Phase 4 planning.
- **geoip-lite accuracy for Korean ISPs specifically:** Global accuracy data exists but Korean ISP IP allocation patterns may differ. Validate with Korean IP ranges during Phase 2.
- **tsdown maturity:** Relatively new tool (Rolldown-based). If build issues arise, tsup is still functional as a fallback despite being in maintenance mode.

## Sources

### Primary (HIGH confidence)
- [Ink GitHub](https://github.com/vadimdemedes/ink) -- TUI framework, CJK IME hooks, React for CLI
- [Hyperswarm GitHub](https://github.com/holepunchto/hyperswarm) -- P2P networking, Noise encryption, NAT traversal
- [Claude Code IME issue #22732](https://github.com/anthropics/claude-code/issues/22732) -- Real-world Korean IME failure in Ink TUI
- [MaxMind Geolocation Accuracy](https://support.maxmind.com/knowledge-base/articles/maxmind-geolocation-accuracy) -- Official accuracy data
- [IP Geolocation Accuracy Study](https://ipapi.is/blog/ip-geolocation-accuracy.html) -- City-level accuracy 40-75%
- [libp2p Hole Punching](https://docs.libp2p.io/concepts/nat/hole-punching/) -- NAT traversal success rates
- [Tailscale NAT Traversal Guide](https://tailscale.com/blog/how-nat-traversal-works) -- NAT traversal techniques

### Secondary (MEDIUM confidence)
- [PCChat (Hyperswarm chat)](https://github.com/Niximkk/PCChat) -- Hyperswarm P2P chat implementation reference
- [termchat](https://github.com/lemunozm/termchat) -- Terminal LAN chat competitor analysis
- [tsdown official site](https://tsdown.dev/) -- Build tool (relatively new)
- [Briar Project](https://briarproject.org/how-it-works/) -- Decentralized P2P messaging architecture reference

### Tertiary (LOW confidence)
- protomux documentation -- Hyperswarm ecosystem protocol multiplexing, sparse docs
- node-datachannel stability for npx distribution -- native binary concerns, needs validation if WebRTC path is chosen over Hyperswarm

---
*Research completed: 2026-03-19*
*Ready for roadmap: yes*
