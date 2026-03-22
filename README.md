# HiveChat

**Meet your terminal friends.**

[![npm](https://img.shields.io/npm/v/hivechat)](https://www.npmjs.com/package/hivechat)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

HiveChat은 터미널에서 근처 개발자를 발견하고 대화하는 CLI P2P 채팅 도구입니다. AI CLI(Claude Code, Codex, Gemini, Cursor 등) 사용자들이 터미널을 떠나지 않고 10km 이내의 개발자와 즉시 연결됩니다.

## Why HiveChat?

- **터미널 친구를 만나세요** — 10km 이내의 개발자가 자동으로 탐지됩니다
- **P2P 직접 연결** — 메시지는 서버를 거치지 않고 피어 간 직접 전송, 암호화됩니다
- **흔적을 남기지 않습니다** — 메시지는 어디에도 저장되지 않습니다. 세션이 끝나면 사라집니다
- **설치 없이 즉시 실행** — `npx hivechat` 한 줄이면 충분합니다

## Quick Start

```bash
npx hivechat
```

Requirements: Node.js 20+

첫 실행 시 닉네임과 사용 중인 AI CLI 도구를 선택합니다. 자동으로 신호 서버(`wss://hivechat-signal.fly.dev`)에 연결되어 근처 사용자를 탐색합니다.

## Features

| Feature | Description |
|---------|-------------|
| **Nearby Discovery** | IP geolocation 기반 10km 이내 사용자 자동 탐지 |
| **P2P Direct Chat** | Hyperswarm 기반 암호화 P2P 연결 (서버 relay 없음) |
| **Friends** | nick#tag로 친구 추가, 온/오프라인 실시간 확인 |
| **Bee Mascot** | 터미널 픽셀 아트 벌 캐릭터가 반겨줍니다 |
| **Korean IME** | 한글 조합 입력 완벽 지원 |
| **Responsive TUI** | 터미널 크기에 맞춰 자동 조절되는 레이아웃 |
| **Security** | P2P handshake 신원 검증, 서버 DDoS 보호, rate limiting |

## Commands

| Command | Description |
|---------|-------------|
| `/nearby` | 근처 사용자 목록 |
| `/friends` | 친구 목록 |
| `/addfriend` | 친구 추가 (nick#tag) |
| `/removefriend` | 친구 삭제 |
| `/help` | 명령어 목록 |
| `/leave` | 채팅 나가기 |
| `/settings` | 설정 변경 |
| `/exit` | HiveChat 종료 |

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

- **Signal Server** — 사용자 발견과 P2P 연결 조율만 담당. 메시지를 중계하거나 저장하지 않습니다
- **Hyperswarm P2P** — 채팅 메시지는 Noise Protocol로 암호화되어 피어 간 직접 전송됩니다
- **Ephemeral** — 모든 메시지는 메모리에만 존재하며, 세션 종료 시 완전히 소멸합니다

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
