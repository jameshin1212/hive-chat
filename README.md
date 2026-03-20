# HiveChat

**Chat with nearby developers right from your terminal.**

[![npm](https://img.shields.io/npm/v/hivechat)](https://www.npmjs.com/package/hivechat)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

<!-- screenshots -->
<!--
<p align="center">
  <img src="docs/screenshot-lobby.png" alt="Lobby - nearby users" width="600">
</p>

<p align="center">
  <img src="docs/screenshot-chat.png" alt="1:1 Chat" width="600">
</p>

<p align="center">
  <img src="docs/screenshot-friends.png" alt="Friends list" width="600">
</p>
-->

## Features

- **Nearby Discovery** -- Find developers near you (1/3/5/10 km range) using IP geolocation
- **1:1 Chat** -- Real-time messaging with relay and P2P direct connection
- **Friends** -- Add and manage friends by nick#tag
- **P2P** -- Hyperswarm-based NAT traversal with relay fallback
- **Korean IME** -- Full support for Korean (Hangul) input composition
- **TUI** -- Terminal UI built with Ink and React

## Quick Start

```bash
npx hivechat
```

Requirements:
- Node.js 20 or later

On first launch, you will be prompted to set a nickname and select your AI CLI tool. HiveChat automatically connects to the signal server at `wss://hivechat-signal.fly.dev`.

## Commands

| Command | Description |
|---------|-------------|
| `/chat nick#tag` | Start a 1:1 chat |
| `/add nick#tag` | Add a friend |
| `/remove nick#tag` | Remove a friend |
| `/friends` | Show friends list |
| `/settings` | Change settings |
| `/back` | Return to lobby |
| `/exit` | Quit HiveChat |

## How It Works

HiveChat uses a lightweight signal server for user discovery and a peer-to-peer layer for direct messaging.

- **Signal server (Fly.io)** -- Handles presence, user discovery, and acts as a relay fallback when direct connections fail.
- **P2P (Hyperswarm)** -- When both peers support it, messages are sent directly without passing through the server.
- **Ephemeral** -- Messages are never stored on the server. Once a session ends, messages are gone.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js >= 20 |
| Language | TypeScript (strict, ESM-only) |
| TUI | Ink 6 + React 19 |
| P2P | Hyperswarm 4 |
| Signaling | ws (WebSocket) |
| Geolocation | geoip-lite (server-side) |
| Validation | Zod |
| Config | conf (XDG-compliant) |
| Build | tsdown |
| Test | Vitest |

## Project Structure

```
packages/
  client/     # CLI client (published to npm as hivechat)
  server/     # Lightweight signal server (deployed to Fly.io)
  shared/     # Protocol types + Zod schemas
```

## Development

```bash
git clone https://github.com/jameshin1212/hive-chat.git
cd hivechat
npm install
npm run dev     # Start client in dev mode
npm test        # Run tests
```

To run the signal server locally:

```bash
cd packages/server
npm run dev
```

## License

[MIT](LICENSE)
