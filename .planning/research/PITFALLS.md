# Pitfalls Research

**Domain:** CLI P2P Chat Tool (Terminal-based, npm distribution, IP geolocation)
**Researched:** 2026-03-19
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Korean/CJK IME Composition Invisible in Raw Mode TUI

**What goes wrong:**
Terminal raw mode (`setRawMode(true)`) bypasses the OS IME composition layer. Korean input requires multi-keystroke composition (e.g., `ㅎ` + `ㅏ` + `ㄴ` = `한`), but raw mode delivers individual bytes without IME composition events. Result: characters are completely invisible during composition. Users type blind and only see output after pressing Enter/Space. This is a documented issue in Ink-based TUI applications (claude-code issue #22732, opencode issue #2920).

**Why it happens:**
Raw mode gives byte-level STDIN access for real-time key handling (required for TUI), but this fundamentally conflicts with IME's multi-stage character formation. Ink's TextInput processes keystrokes individually without understanding composition state. Additionally, Ink hides the real terminal cursor and renders a visual cursor via ANSI styles, so the IME candidate window appears at screen bottom-left instead of at the cursor position.

**How to avoid:**
- Do NOT use raw mode for the chat input field. Use a hybrid approach: raw mode for TUI navigation/commands, but switch to cooked/line mode for message composition.
- Alternatively, implement a composition buffer that detects IME state heuristically from raw byte sequences, maintaining a separate pre-edit buffer with visual underline indicator.
- If using Ink, leverage `string-width` for calculating cursor positions with wide characters and check their `examples/cursor-ime` reference implementation.
- If using blessed, enable the `fullUnicode` option for East Asian double-width character rendering.
- Test with actual Korean IME on macOS (Hangul input) and Linux (ibus/fcitx) from day one.

**Warning signs:**
- Input field appears empty while typing Korean/Japanese/Chinese
- IME candidate window appears in wrong position (bottom-left corner)
- Double-width characters cause cursor misalignment
- Works fine in English, breaks with any CJK input

**Phase to address:**
Phase 1 (TUI foundation). This must be validated before building any chat features on top. A chat app where Korean users cannot type is DOA.

---

### Pitfall 2: P2P NAT Traversal Fails for 15-30% of Users

**What goes wrong:**
Direct P2P connections via TCP/UDP hole punching fail silently when users are behind symmetric NATs, corporate firewalls, or carrier-grade NAT (CGNAT). Symmetric NATs assign different external ports for each destination, making hole punching fundamentally unreliable. Research shows TCP hole punching achieves ~70-86% success rate under ideal conditions. In practice, with diverse ISP configurations, 15-30% of connection attempts will fail. Users see "connecting..." forever with no fallback.

**Why it happens:**
Developers test on local networks or simple NAT configurations where hole punching works perfectly. Symmetric NAT (common in corporate/university networks and mobile carriers) creates unique mappings per destination, so the public endpoint discovered via signaling server differs from the one needed for the actual peer connection. CGNAT (increasingly common as IPv4 addresses exhaust) adds another layer of NAT that compounds the problem.

**How to avoid:**
- Design the architecture with a TURN-like relay fallback from the start. Never assume direct P2P will always work.
- Implement ICE-like negotiation: try direct connection first (STUN), fall back to relay (TURN) within 3-5 seconds.
- The signaling server should double as a lightweight message relay for fallback cases. Since messages are ephemeral text (not video/audio), relay bandwidth is minimal.
- Use multiple STUN servers in ICE configuration for resilience.
- Detect NAT type during initial connection setup and skip hole punching entirely for known-symmetric NATs.

**Warning signs:**
- "Works on my machine" but users report connection failures
- Connection success rate drops when testing across different networks
- Users on mobile data or corporate WiFi can never connect
- Connection attempts hang without timeout

**Phase to address:**
Phase 2 (P2P networking). The relay fallback architecture must be designed alongside the P2P layer, not bolted on later. If the signaling server is designed only for discovery, adding relay capability later requires protocol changes.

---

### Pitfall 3: IP Geolocation Gives Wrong City for 25-60% of Users

**What goes wrong:**
The "nearby users" feature relies on IP geolocation to determine user location within 1-10km radius. But IP geolocation city-level accuracy is only 40-75% depending on the provider and region. Strict accuracy (within 10km) drops to 15-35%. Users in suburbs get mapped to the nearest ISP hub (often 20-50km away in a different city). Mobile users get mapped to their carrier's routing hub (potentially hundreds of km away). VPN users get mapped to their VPN server location (potentially a different country). The "nearby" feature becomes meaningless when 1 in 4 users appears in the wrong location.

**Why it happens:**
IP geolocation databases map IP ranges to locations based on ISP registration data, not actual user position. ISPs allocate IP blocks at regional hubs, not per-neighborhood. Mobile carriers route through centralized hubs. VPN/proxy traffic exits at server locations. Different geolocation databases disagree on the same IP address. There is no standardized IP-to-location mapping.

**How to avoid:**
- Set minimum radius to 10km (not 1km) and default to a larger radius. Be honest in UX that "nearby" means "same metro area."
- Detect VPN/proxy/datacenter IPs (MaxMind provides this classification) and show a warning: "VPN detected - location may be inaccurate."
- Use multiple geolocation sources and cross-reference. If they disagree by >50km, flag uncertainty.
- Allow users to optionally set their city manually as an override.
- Design the UX around discovery radius being approximate: "Users near Seoul" not "Users within 3km."
- Consider falling back to country/region level if city data has low confidence score (MaxMind provides confidence percentages).

**Warning signs:**
- Users report seeing no nearby users despite being in a dense city
- Users report appearing in wrong cities
- Mobile users consistently appear far from their actual location
- "1km radius" returns zero results in populated areas

**Phase to address:**
Phase 1-2 (signaling server + location). Choose the geolocation provider and validate accuracy against real IPs before building the discovery UX. The UI labels and radius options should reflect actual accuracy, not aspirational accuracy.

---

### Pitfall 4: npx Cold Start Takes 10-30 Seconds, Users Abandon

**What goes wrong:**
`npx double-talk` downloads and installs the package on first run. If the package has many dependencies (TUI library + WebSocket + crypto + geolocation client), the initial install takes 10-30 seconds with no visible feedback. Users think the command hung and Ctrl+C. Even after caching, npx version resolution adds 2-5 seconds overhead. Native dependencies (if any) require compilation that may fail on systems without build tools.

**Why it happens:**
npm's dependency tree is deep. A TUI library like blessed pulls ~30 dependencies. Adding WebSocket, crypto, and HTTP client libraries compounds this. npx runs `npm install` in a temporary directory each time (unless cached). Users of `npx` expect instant execution like any other CLI command.

**How to avoid:**
- Zero native dependencies. Use only pure JavaScript/TypeScript packages. No node-gyp, no C++ bindings.
- Minimize dependency count aggressively. Prefer built-in Node.js modules (`readline`, `net`, `crypto`, `http`) over npm packages where feasible.
- Bundle with esbuild/rollup into a single file to eliminate install-time dependency resolution.
- Show immediate ASCII banner/spinner on first output before any async initialization.
- Consider recommending global install (`npm i -g double-talk`) in docs for frequent users.
- Test npx cold start time on every release. Budget: under 5 seconds on broadband.

**Warning signs:**
- `npm pack` produces a tarball over 1MB
- `npm install` takes more than 5 seconds on fast connection
- Package has native optional dependencies that fail on some platforms
- No output appears for several seconds after running `npx double-talk`

**Phase to address:**
Phase 1 (project setup). Choose minimal dependencies from the start. Switching from a heavy TUI library to a lighter one later means rewriting the entire UI layer.

---

### Pitfall 5: Terminal Compatibility Breaks Across OS and Emulators

**What goes wrong:**
TUI rendering that works in iTerm2 breaks in Windows Terminal, GNOME Terminal, or basic Terminal.app. Specific failures: ANSI 256-color/truecolor codes render as garbage in terminals that only support 16 colors. Box-drawing characters (for chat bubbles/borders) render as `?` in terminals without UTF-8. Mouse events are handled differently across terminal emulators. Window resize events (`SIGWINCH`) behave differently or are missing on Windows. `process.stdout.columns` returns `undefined` when piped.

**Why it happens:**
Terminal emulators implement different subsets of ANSI/VT100/xterm escape codes. Windows Terminal has dramatically improved but older ConHost still has gaps. Each terminal has different Unicode rendering capabilities. There is no universal terminal capability detection beyond basic TERM environment variable.

**How to avoid:**
- Use `supports-color` to detect color depth and degrade gracefully (truecolor -> 256 -> 16 -> monochrome).
- Stick to basic ANSI codes (bold, dim, underline, 16 colors) for essential UI. Use extended colors only for decorative elements.
- Use `is-unicode-supported` to detect if box-drawing characters will render, and provide ASCII fallbacks (`+--+` instead of `|--|`).
- Handle missing `process.stdout.columns` gracefully (default to 80).
- Test on: macOS Terminal.app, iTerm2, Windows Terminal, GNOME Terminal, and tmux/screen (which strip certain escape sequences).
- Avoid mouse event dependency for core functionality.

**Warning signs:**
- UI looks perfect in developer's iTerm2 but garbled in screenshots from users
- Box-drawing characters show as question marks
- Colors appear wrong or not at all
- Layout breaks when terminal is narrow (<80 columns)

**Phase to address:**
Phase 1 (TUI foundation). Establish terminal capability detection and graceful degradation patterns before building complex UI.

---

### Pitfall 6: WebSocket/TCP Connection Silently Dies, No Recovery

**What goes wrong:**
The signaling server WebSocket connection drops without triggering `close` or `error` events. TCP keepalive defaults are too long (2 hours on Linux). Users appear "online" to others but cannot receive messages. P2P connections die when laptop sleeps/wakes but the application doesn't detect the state change. Network switches (WiFi to mobile) drop all connections without notification.

**Why it happens:**
TCP does not guarantee delivery notification for dropped connections. If a network path dies (NAT mapping expires, router restarts, laptop sleeps), the TCP stack may not detect the failure for minutes or hours. WebSocket `close` events only fire for clean disconnections, not network failures. Intermediate proxies/load balancers may close idle connections after 60-120 seconds without notifying either end.

**How to avoid:**
- Implement application-level ping/pong heartbeat every 15-30 seconds on both signaling and P2P connections.
- Use exponential backoff with jitter for reconnection (start 500ms, cap at 30s). Jitter prevents thundering herd when server restarts.
- Set TCP keepalive to 30 seconds (not the default 2 hours): `socket.setKeepAlive(true, 30000)`.
- Buffer outbound messages during reconnection and replay after reconnect.
- Detect sleep/wake events and immediately trigger reconnection on wake.
- Show connection status clearly in TUI (connected/reconnecting/offline).
- Assign sequence numbers to signaling messages for gap detection after reconnect.

**Warning signs:**
- Users show as "online" but don't respond to messages
- Messages silently disappear (sent but never delivered)
- App works fine for 5 minutes then "freezes" (actually disconnected)
- Reconnection creates duplicate sessions on the signaling server

**Phase to address:**
Phase 2 (networking layer). Connection health monitoring must be built into the WebSocket/TCP abstraction layer, not added as an afterthought to individual connection handlers.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip relay fallback, P2P only | Simpler architecture, no relay server cost | 15-30% of users can never connect | Never for a chat app |
| Use `readline` instead of TUI library | Zero dependencies, instant startup | No split-pane layout, no concurrent input/output, no chat bubble rendering | Prototype only, rewrite needed |
| Hardcode single geolocation API | Fast implementation | API goes down = feature dies, rate limits hit with growth | MVP only, add fallback by v1 |
| Store identity in plain JSON file | Simple persistence | No migration path when schema changes, race conditions on concurrent access | Acceptable if you define a version field from day one |
| Skip message encryption | Simpler P2P protocol | All messages are plaintext over network, easily sniffed | Never for a real product; acceptable for initial prototype if documented |
| Synchronous geolocation lookup on startup | Simpler code flow | Blocks TUI rendering for 1-3 seconds on every launch | Never; always async with loading indicator |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| IP Geolocation API (MaxMind/ipinfo) | Calling API on every request, hitting rate limits | Cache result locally with 1-hour TTL. IP rarely changes for desktop users. Free tiers have 1K-50K requests/month limits. |
| STUN servers (Google/Twilio) | Using only one STUN server | Use 2-3 STUN servers. Google's `stun.l.google.com:19302` is free but undocumented/unsupported. Include a self-hosted fallback. |
| npm registry (npx distribution) | Publishing with `devDependencies` in bundle | Use `.npmignore` or `files` field in package.json. `devDependencies` should never ship. Test with `npm pack` + `npm install <tarball>`. |
| WebSocket library (ws) | Assuming `ws` handles reconnection | `ws` is a raw WebSocket implementation. Reconnection, heartbeat, and backoff must be implemented manually or use `reconnecting-websocket`. |
| Terminal (cross-platform) | Assuming `process.stdout.columns` always exists | Returns `undefined` when output is piped or in non-TTY contexts. Always provide fallback: `process.stdout.columns \|\| 80`. |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Re-rendering entire TUI on every message | Input lag, flickering, high CPU | Differential rendering: only update changed regions. Ink handles this via React reconciliation. Blessed has `screen.render()` optimization. | >50 messages/second in active group chat |
| Unbounded message buffer in TUI | Memory grows continuously during long sessions | Cap visible message history (e.g., last 500 messages). Old messages scroll off and are freed. | Multi-hour sessions with active chat |
| Signaling server stores all online users in memory | Works at 100 users, OOM at 100K | Use geospatial index (Redis GEO or in-memory R-tree) for location queries instead of scanning all users | >10K concurrent users |
| Geolocation lookup blocks event loop | TUI freezes for 1-3s on startup | Async lookup with immediate TUI render showing "detecting location..." | Always noticeable on slow networks |
| `string-width` called on every render frame | Sluggish TUI with CJK/emoji content | Cache width calculations for unchanged strings. Width only changes when content changes. | Chat with heavy emoji/CJK usage |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Exposing user's real IP to all "nearby" users via signaling server | IP address leakage enables DDoS, physical location tracking | Signaling server should broker P2P connections without exposing IPs to the user list. Only exchange IPs during active connection handshake between consenting users. |
| No rate limiting on signaling server | DDoS, spam user registration, location scraping | Rate limit by IP: connection attempts, message relay, user discovery queries. Use sliding window, not fixed window. |
| Trusting client-reported location | Users can fake location to appear anywhere, stalk specific users | Server should determine location from connecting IP, never trust client-reported coordinates. |
| Plaintext P2P messages | Network sniffing reveals all chat content | Use TLS for signaling WebSocket (wss://). For P2P, implement lightweight encryption (TweetNaCl/libsodium) with key exchange during handshake. |
| Predictable user ID tags | Enumeration attack to discover all users | Use cryptographically random tag generation (4+ hex chars from `crypto.randomBytes`), not sequential or timestamp-based. |
| No abuse/block mechanism | Harassment with no recourse | Implement client-side block list (persisted locally). Blocked users cannot initiate P2P connections. |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No visual feedback during P2P connection setup | User thinks app is frozen. Connection can take 3-10 seconds for hole punching. | Show connection state: "Discovering peer... Connecting... Connected!" with spinner |
| Chat input and message display in same region | Incoming messages push input field around, losing typing context | Split layout: fixed input area at bottom, scrolling message area above. This is standard for chat UIs but easy to skip in TUI. |
| No indication of message delivery | User doesn't know if message was received | Implement delivery acknowledgment. Show sent/delivered indicators (checkmarks or similar ASCII indicators). |
| Blocking UI during nickname setup | First-run experience feels heavy | Make nickname optional with auto-generated default (e.g., "anon#3A7F"). Let users change later with `/nick` command. |
| Unicode username rendering misalignment | Korean/Japanese nicknames break column alignment in user list | Use `string-width` for all column calculations. Test with mixed ASCII + CJK + emoji usernames. |
| No graceful exit | Ctrl+C leaves ghost sessions on signaling server | Handle SIGINT/SIGTERM: send disconnect to signaling server, close P2P connections, then exit. Set a 2-second force-exit timeout. |

## "Looks Done But Isn't" Checklist

- [ ] **Korean input:** Test actual Korean IME composition (not just pasting Korean text). Type `hangul` using Korean keyboard and verify each jamo combines correctly in real-time.
- [ ] **P2P connectivity:** Test between two different ISPs/networks (not just localhost or same LAN). Test with one user on mobile hotspot.
- [ ] **Nearby users:** Test with VPN enabled. Test from a suburban location. Verify the displayed distance is plausible.
- [ ] **npx cold start:** Run `npx double-talk` on a machine that has never installed it. Time it. Clear npm cache and try again.
- [ ] **Terminal compatibility:** Test in tmux/screen (which strip some escape sequences). Test with TERM=xterm-256color AND TERM=xterm.
- [ ] **Reconnection:** Kill WiFi mid-chat, wait 10 seconds, re-enable. Verify reconnection and message delivery after recovery.
- [ ] **Concurrent users:** Test group chat with 5+ users simultaneously. Verify messages arrive at all participants in order.
- [ ] **Long session:** Leave app running for 1+ hour. Verify signaling server connection is still alive (heartbeat working).
- [ ] **Graceful shutdown:** Ctrl+C during active chat. Verify peer sees disconnect status, not "online" ghost.
- [ ] **Emoji in messages:** Send emoji (especially compound emoji like family emoji) and verify they don't break layout alignment.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Wrong TUI library choice (no CJK support) | HIGH | Full UI rewrite. Mitigate by prototyping Korean input in the first week before building features. |
| P2P-only architecture (no relay) | HIGH | Requires protocol changes, new server infrastructure, client updates. Design relay into the protocol from the start. |
| IP geolocation too granular (1km promises) | LOW | Change UI labels and default radius. No code changes needed if radius is configurable. |
| npx startup too slow (heavy deps) | MEDIUM | Bundle with esbuild. May need to replace heavy libraries with lighter alternatives. |
| No heartbeat/reconnection | MEDIUM | Add heartbeat layer to existing WebSocket abstraction. Requires testing all connection states. |
| Plaintext P2P messages | MEDIUM | Add encryption layer to existing message protocol. Requires key exchange during handshake, but message format change is additive. |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| CJK IME composition invisible | Phase 1 (TUI setup) | Type Korean sentence in input field, verify real-time character composition visible |
| NAT traversal failure (no relay) | Phase 2 (P2P networking) | Connect two users on different ISPs; test with symmetric NAT (mobile hotspot) |
| IP geolocation inaccuracy | Phase 2 (signaling + discovery) | Compare reported location vs actual for 10+ IPs across different ISPs and mobile |
| npx cold start too slow | Phase 1 (project setup) | `time npx double-talk` on clean npm cache < 5 seconds |
| Terminal compatibility | Phase 1 (TUI foundation) | Screenshot comparison across 4 target terminals + tmux |
| Connection silent death | Phase 2 (networking) | Kill network mid-session, verify reconnection within 30 seconds |
| IP exposure to user list | Phase 2 (signaling server) | Inspect signaling protocol: IPs never in discovery/list responses |
| No abuse mechanism | Phase 3 (social features) | Block a user, verify they cannot re-initiate contact |
| Message delivery uncertainty | Phase 3 (chat polish) | Send message, verify delivery indicator appears within 1 second |

## Sources

- [Claude Code IME composition issue #22732](https://github.com/anthropics/claude-code/issues/22732) - Korean IME invisible during composition in Ink TUI
- [OpenCode double-byte character issue #2920](https://github.com/anomalyco/opencode/issues/2920) - TUI hides double-byte characters
- [Claude Code IME cursor position issue #19207](https://github.com/anthropics/claude-code/issues/19207) - IME candidate window mispositioned
- [MaxMind Geolocation Accuracy](https://support.maxmind.com/knowledge-base/articles/maxmind-geolocation-accuracy) - Official accuracy documentation
- [IP Geolocation Accuracy Study](https://ipapi.is/blog/ip-geolocation-accuracy.html) - Comparative accuracy study showing 15-35% city-level accuracy
- [libp2p Hole Punching](https://docs.libp2p.io/concepts/nat/hole-punching/) - NAT traversal documentation and success rates
- [Symmetric NAT discussion](https://discuss.libp2p.io/t/symmetric-nat-holepunching/1335) - libp2p community discussion on symmetric NAT challenges
- [WebSocket Reconnection Guide](https://websocket.org/guides/reconnection/) - State sync and recovery patterns
- [reconnecting-websocket npm](https://www.npmjs.com/package/reconnecting-websocket) - Auto-reconnection library for WebSocket
- [string-width npm](https://www.npmjs.com/package/string-width) - Terminal string width calculation for CJK/emoji
- [Ink GitHub](https://github.com/vadimdemedes/ink) - React for CLI, cursor-ime example for CJK support

---
*Pitfalls research for: CLI P2P Chat Tool (Double Talk)*
*Researched: 2026-03-19*
