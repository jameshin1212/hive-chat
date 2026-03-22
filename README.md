# HiveChat

**Meet your terminal friends.**

[![npm](https://img.shields.io/npm/v/hivechat)](https://www.npmjs.com/package/hivechat)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

HiveChat is a CLI peer-to-peer chat tool that lets you discover and talk to developers nearby. Built for AI CLI users (Claude Code, Codex, Gemini, Cursor, etc.) who live in the terminal — find someone within 10km and start chatting without leaving your workflow.

## Why HiveChat?

- **Discover nearby developers** — Automatically detects developers within 10km using IP geolocation
- **True P2P connection** — Messages travel directly between peers, encrypted via Noise Protocol. The server never sees your messages
- **Zero trace** — Nothing is stored anywhere. When the session ends, messages are gone forever
- **One command to start** — Just run `npx hivechat`. No signup, no install, no config

## Quick Start

```bash
npx hivechat
```

Requires Node.js 20+

On first launch, pick a nickname and select your AI CLI tool. HiveChat connects to the signal server (`wss://hivechat-signal.fly.dev`) and automatically discovers nearby users.

## Features

| Feature | Description |
|---------|-------------|
| **Nearby Discovery** | Find developers within 10km via IP geolocation |
| **P2P Direct Chat** | Encrypted peer-to-peer messaging via Hyperswarm (no server relay) |
| **Friends** | Add friends by nick#tag, see real-time online/offline status |
| **Bee Mascot** | A pixel art bee greets you in the terminal |
| **CJK/IME Support** | Full Korean, Japanese, and Chinese input composition |
| **Responsive TUI** | Layout adapts to any terminal size |
| **Security** | P2P identity verification, DDoS protection, rate limiting |

## Commands

| Command | Description |
|---------|-------------|
| `/nearby` | List nearby users |
| `/friends` | Show friend list |
| `/addfriend` | Add a friend by nick#tag |
| `/removefriend` | Remove a friend |
| `/help` | Show available commands |
| `/leave` | Leave current chat |
| `/settings` | Change nickname or AI CLI |
| `/exit` | Quit HiveChat |

## How It Works

```
┌─────────────┐       ┌──────────────┐       ┌─────────────┐
│  Terminal A  │──P2P──│  Hyperswarm  │──P2P──│  Terminal B  │
│  (Client)    │       │  (DHT)       │       │  (Client)    │
└──────┬──────┘       └──────────────┘       └──────┬──────┘
       │                                            │
       └────── Signal Server (Fly.io) ──────────────┘
                 discovery only, no messages
```

- **Signal Server** — Handles user discovery and P2P connection coordination only. It never relays or stores messages
- **Hyperswarm P2P** — Chat messages are encrypted with Noise Protocol and sent directly between peers
- **Ephemeral** — All messages exist only in memory. They vanish completely when the session ends

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
| Test | Vitest (300+ tests) |

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
cd hive-chat
npm install
npm run build
node packages/client/bin/hivechat.js
```

Run tests:

```bash
npm test
```

## License

[MIT](LICENSE)
