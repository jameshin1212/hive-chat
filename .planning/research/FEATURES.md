# Feature Research

**Domain:** CLI P2P Chat with Location-Based Discovery (Developer-Focused)
**Researched:** 2026-03-19
**Confidence:** MEDIUM-HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Nickname + unique ID | Every chat tool has identity. Discord-style `nick#tag` is intuitive | LOW | Auto-generated tag on first run, stored locally in config file |
| 1:1 direct messaging | Core chat functionality. Without it, it's not a chat tool | MEDIUM | P2P connection via signaling server for IP exchange |
| Online/offline presence | Users need to know who's available before starting a chat | LOW | Heartbeat to signaling server, propagated to peers |
| Nearby user discovery | Core value proposition. Without this, it's just another chat tool | MEDIUM | IP geolocation on signaling server, return users within radius |
| Configurable discovery radius | Location-based apps always let you set range (1/3/5/10km) | LOW | Client-side filter on server response, or server-side query param |
| TUI with split layout | Terminal chat without proper UI is unusable. Message area + input area minimum | MEDIUM | 80/20 vertical split is standard. termchat, weechat all do this |
| Message input with multibyte support | Korean/Japanese/emoji input must work. Broken IME = unusable for CJK users | HIGH | TUI library selection is critical. Must handle IME composition correctly |
| Graceful connection handling | Users expect clean disconnect/reconnect, not crashes on network issues | MEDIUM | Connection state machine, auto-reconnect logic |
| Clear exit mechanism | Ctrl+C or `/quit` must work cleanly without orphan processes | LOW | Signal handlers, cleanup on exit |
| npx instant execution | Project constraint. Zero-install experience is expected for npm CLI tools | LOW | Package must be self-contained, no native dependencies ideally |

### Differentiators (Competitive Advantage)

Features that set Double Talk apart from generic terminal chat tools.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| AI CLI tool badge | Show which AI CLI (Claude Code, Codex, Gemini, Cursor) each user uses. Creates tribal identity and conversation starters among developers | LOW | Selection during onboarding, displayed next to nickname |
| Ephemeral-by-design messaging | No message history, no logs, no persistence. Privacy as a feature, not a bug. Reduces legal/privacy concerns. Like Snapchat for devs | LOW | Simply don't implement storage. Document as intentional design |
| Friend system with remote P2P | Add friends by `nick#tag` regardless of location. Signaling server brokers the connection. Combines location discovery + social graph | HIGH | NAT traversal is the hard part. Need STUN/TURN fallback for firewalled users |
| Group chat (ad-hoc) | Create temporary group from nearby users or friends. No channels, no persistence, just quick coordination | HIGH | Multi-party P2P is significantly harder than 1:1. Consider mesh or relay topology |
| Developer-specific context | Unlike generic location apps (Vicinity, Kiki), Double Talk targets AI CLI users specifically. The terminal-native experience IS the filter | LOW | Branding, onboarding flow, tool selection |
| Terminal bell / notification on message | weechat and termchat both support this. Crucial for background tab usage pattern | LOW | Terminal bell character `\x07` or OS notification via node-notifier |
| Color themes | WeeChat supports 256 colors, custom themes. Developer audience expects customization | MEDIUM | Theme config file with presets (dark, light, hacker green) |
| Connection status indicator | Visual indicator showing P2P connection health (direct, relayed, disconnected) | LOW | Map WebRTC/connection state to TUI status bar icon |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems for Double Talk specifically.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Message history / persistence | "I want to see what I missed" | Contradicts ephemeral design. Adds storage complexity, privacy liability. If you store messages, you need encryption-at-rest, retention policies, GDPR compliance | Keep ephemeral. Show session-only scrollback in TUI buffer. Clearly communicate "messages vanish when you close" |
| File transfer | "Let me share code snippets" | P2P file transfer is complex (chunking, resume, progress). Significant attack surface. v1 scope creep | For v1, text-only. Users can share gist URLs. Consider v2 with clipboard/paste sharing |
| Voice/video calls | termchat has streaming, Tox has voice/video | Massive complexity. WebRTC media in terminal is unusual. Audio capture/playback from CLI is non-trivial | Stay text-only. The terminal IS the constraint and the charm |
| End-to-end encryption | "Messages should be encrypted" | P2P connections are already direct (no server relay). Adding E2E properly requires key exchange, verification, trust model. Half-baked crypto is worse than none | v1: TLS on P2P connections for transport security. Clearly document threat model. v2: consider NaCl/libsodium key exchange if demand exists |
| OAuth / email authentication | "I want to keep my identity across devices" | Adds server complexity, account management, password reset flows. Kills the zero-friction onboarding | Keep anonymous auto-generated identity. Allow export/import of identity file for device portability |
| Channel / room system | "Like IRC/Discord channels" | Adds persistence expectations, moderation needs, topic management. Scope explosion | Ad-hoc groups are sufficient. No permanent rooms. Create, chat, done |
| Rich text / markdown rendering | "Format my messages" | Terminal rendering of markdown is fragile across terminals. Adds parsing complexity | Plain text with maybe basic color codes. Code blocks via backtick detection at most |
| GPS-precise location | "IP geolocation is inaccurate" | CLI tools run on desktops without GPS. Requesting precise location is creepy for a dev chat tool. IP geolocation gives city-level which is sufficient for "nearby" | IP geolocation is intentionally approximate. "Nearby" means same city/area, not same building |
| Web/mobile client | "I want to chat from my phone too" | Splits focus, doubles maintenance. CLI-native IS the identity | Stay CLI-only. If demand proves out, consider a separate project |

## Feature Dependencies

```
[Signaling Server]
    └──requires──> [Identity System (nick#tag)]
                       └──enables──> [Presence (online/offline)]
                       └──enables──> [Nearby Discovery]
                       └──enables──> [Friend System]

[1:1 Chat]
    └──requires──> [Signaling Server] (for peer discovery / IP exchange)
    └──requires──> [P2P Connection Layer] (NAT traversal, direct connection)
    └──requires──> [TUI] (message display + input)

[Group Chat]
    └──requires──> [1:1 Chat] (extends P2P connection model)
    └──requires──> [Nearby Discovery] OR [Friend System] (to select participants)

[Friend System]
    └──requires──> [Identity System]
    └──requires──> [Signaling Server] (to resolve nick#tag to IP)
    └──enhances──> [1:1 Chat] (chat with remote friends)
    └──enhances──> [Group Chat] (create friend-based groups)

[TUI]
    └──requires──> [Multibyte Input Support] (IME handling)
    └──enhances──> [1:1 Chat] (split pane, scrollback)
    └──enhances──> [Presence] (status indicators in UI)

[Nearby Discovery]
    └──requires──> [Signaling Server]
    └──requires──> [IP Geolocation]
    └──enhances──> [Group Chat] (nearby group creation)
```

### Dependency Notes

- **1:1 Chat requires Signaling Server + P2P Layer + TUI:** All three must exist before any chat happens. This is the critical path.
- **Group Chat requires 1:1 Chat:** Multi-party builds on the P2P connection model. Don't attempt group before 1:1 is solid.
- **Friend System requires Identity + Signaling:** Friends are resolved through the signaling server. The identity system must be stable before friends make sense.
- **TUI requires Multibyte Support:** If Korean/CJK input is broken, the TUI is fundamentally broken for the target audience. Library selection is gating.
- **Nearby Discovery requires IP Geolocation:** The signaling server must integrate a geolocation service before discovery works.

## MVP Definition

### Launch With (v1)

Minimum viable product -- what's needed to validate the concept.

- [ ] Identity system (nickname + auto-generated tag, local storage) -- foundation for everything
- [ ] Signaling server (user registration, presence, IP exchange) -- enables peer discovery
- [ ] IP geolocation on signaling server -- enables "nearby" core value
- [ ] Nearby user list with radius selection -- the core differentiator
- [ ] P2P 1:1 chat connection -- the core functionality
- [ ] TUI with split layout (messages + input) -- minimum usable interface
- [ ] Multibyte character support (Korean, Japanese, emoji) -- non-negotiable for target audience
- [ ] AI CLI tool badge display -- low-cost differentiator, adds developer identity
- [ ] Online/offline presence -- users need to know who's available
- [ ] Ephemeral messages (session-only, no persistence) -- intentional design, not missing feature

### Add After Validation (v1.x)

Features to add once core is working and users are chatting.

- [ ] Friend system (add/remove by nick#tag) -- add when users want to reconnect with people they met nearby
- [ ] Remote friend P2P connection (NAT traversal) -- add when friend system proves valuable
- [ ] Terminal notification on new message -- add when users report missing messages in background tabs
- [ ] Color themes / customization -- add when users request personalization
- [ ] Connection health indicator in status bar -- add when users report confusion about connection state

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] Group chat -- significant complexity. Defer until 1:1 chat is proven and users explicitly request it
- [ ] Code snippet sharing (paste-bin style) -- only if text-only feels too limiting
- [ ] Identity export/import -- only if users want to use Double Talk across machines
- [ ] Plugin/extension system -- only if a developer community forms around the tool

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Identity system (nick#tag) | HIGH | LOW | P1 |
| Signaling server | HIGH | MEDIUM | P1 |
| IP geolocation | HIGH | LOW | P1 |
| Nearby user discovery | HIGH | MEDIUM | P1 |
| P2P 1:1 chat | HIGH | HIGH | P1 |
| TUI (split layout) | HIGH | MEDIUM | P1 |
| Multibyte input | HIGH | MEDIUM | P1 |
| Online/offline presence | HIGH | LOW | P1 |
| AI CLI badge | MEDIUM | LOW | P1 |
| Ephemeral messaging | HIGH | LOW (don't build storage) | P1 |
| Friend system | MEDIUM | MEDIUM | P2 |
| NAT traversal for friends | MEDIUM | HIGH | P2 |
| Terminal notifications | MEDIUM | LOW | P2 |
| Color themes | LOW | MEDIUM | P2 |
| Connection health UI | LOW | LOW | P2 |
| Group chat | MEDIUM | HIGH | P3 |
| Code snippet sharing | LOW | MEDIUM | P3 |
| Identity export/import | LOW | LOW | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | WeeChat/Irssi (IRC) | termchat (LAN) | Briar (P2P) | Location Apps (Vicinity etc.) | Double Talk |
|---------|---------------------|----------------|-------------|-------------------------------|-------------|
| Discovery | Server/channel list | Multicast LAN auto-discovery | Contact exchange (QR/link) | GPS-based map | IP geolocation + signaling server |
| Identity | Nick registration on server | Username flag | Cryptographic identity | Account (email/phone) | Anonymous nick#tag auto-generated |
| Messaging | Server-relayed | LAN direct | P2P encrypted | Server-relayed | P2P direct via signaling |
| Group chat | Channels (persistent) | Broadcast to all LAN peers | Private groups | Chatrooms by location | Ad-hoc groups (ephemeral) |
| Persistence | Server-side logs, client logs | None | Encrypted local storage | Server-stored | None (intentional) |
| File transfer | DCC | Built-in broadcast | Not in base | Photos via server | Not in v1 |
| Notifications | Terminal bell, desktop | Terminal bell | Push notifications | Push notifications | Terminal bell |
| Themes/colors | Extensive (256 color, scripts) | Light/dark + custom colors | N/A (mobile) | N/A (mobile) | Planned for v1.x |
| NAT traversal | N/A (server-based) | N/A (LAN only) | Tor network | N/A (server-based) | STUN/TURN needed for remote friends |
| Scope | IRC protocol, any network | Single LAN | Global, Tor-based | City/radius | Nearby + remote friends |
| Platform | Terminal (any OS) | Terminal (any OS) | Android (desktop experimental) | iOS/Android | Terminal (any OS via npm) |

## Key Insights

1. **No direct competitor exists** in the "CLI + location-based + developer-focused" intersection. termchat is LAN-only, IRC clients need servers/channels, location apps are mobile-only. Double Talk occupies a unique niche.

2. **The hardest technical challenge is NAT traversal for remote friends.** LAN-only tools (termchat) avoid this entirely. Server-based tools (IRC, location apps) route through servers. True P2P across the internet requires STUN/TURN infrastructure. Consider a TURN relay fallback when direct P2P fails.

3. **Ephemeral messaging is both a feature and a marketing angle.** In an era of data retention anxiety, "we literally cannot show your messages to anyone because we don't store them" is compelling. Lean into this.

4. **The AI CLI badge is a surprisingly strong differentiator.** It creates tribal identity ("oh, another Claude Code user nearby!") and immediate conversation context. Low implementation cost, high social value.

5. **Group chat should be deferred aggressively.** Multi-party P2P is an order of magnitude harder than 1:1. Every existing tool that does group chat either uses a server relay or LAN broadcast. For P2P group chat across the internet, you'd need a mesh topology or a temporary relay. Save this for v2.

## Sources

- [WeeChat vs Irssi comparison - Slant](https://www.slant.co/versus/4383/4384/~weechat_vs_irssi)
- [termchat - Terminal LAN chat](https://github.com/lemunozm/termchat)
- [Briar Project](https://briarproject.org/how-it-works/)
- [Vicinity - Proximity Chat App](https://apps.apple.com/us/app/vicinity-proximity-chat/id1536080128)
- [BitChat - P2P BLE Messaging](https://bitchat.free/)
- [Awesome Decentralized Apps List](https://github.com/croqaz/awesome-decentralized)
- [Top 5 Decentralized Messaging Apps 2025](https://blog.usro.net/2024/10/top-5-decentralized-messaging-apps-to-protect-your-privacy-in-2025/)
- [P2P NAT Traversal Guide](https://itnext.io/p2p-nat-traversal-how-to-punch-a-hole-9abc8ffa758e)
- [Nearblink - Nearby User Discovery](https://nearblink.com/)
- [@dskuldeep/terminal-chat on npm](https://www.npmjs.com/package/@dskuldeep/terminal-chat)

---
*Feature research for: CLI P2P Chat with Location-Based Discovery*
*Researched: 2026-03-19*
