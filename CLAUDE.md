# HiveChat — Project Instructions

## Project Overview

CLI P2P 채팅 도구. AI CLI(Claude Code, Codex, Gemini, Cursor) 사용자들이 터미널에서 근처 개발자를 발견하고 채팅.
- **Core Value**: 터미널을 떠나지 않고 근처 개발자와 즉시 대화
- **Architecture**: 경량 신호 서버(발견/presence) + P2P 직접 메시지 (relay fallback)
- **Distribution**: `npx hivechat`으로 즉시 실행

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js | >=20 LTS |
| Language | TypeScript (strict, ESM-only) | ^5.7 |
| TUI | Ink + React | ^6.8.0 / ^18 |
| P2P | Hyperswarm | ^4.16.0 |
| Signaling | ws | ^8.19.0 |
| Geolocation | geoip-lite (server-side only) | latest |
| Validation | zod | ^3.24 |
| Config | conf (XDG compliant) | latest |
| Build | tsdown | latest |
| Test | vitest | latest |

**Do NOT use**: blessed/neo-blessed (abandoned, CJK broken), socket.io (over-abstracted), node-webrtc (native binary issues), tsup (deprecated)

## Monorepo Structure

```
packages/
  client/     # CLI 클라이언트 (npm 배포 대상)
  server/     # 경량 신호 서버
  shared/     # Protocol types + zod schemas
```

- `shared/` 패키지의 타입을 반드시 사용하여 client-server 프로토콜 타입 안전성 확보
- client에서 server 코드 직접 import 금지 (shared만 허용)
- 모든 패키지 `"type": "module"` (ESM-only)

## Architecture Patterns

### Relay-First Strategy
Phase 3까지 신호 서버가 메시지 relay 담당. Phase 5에서 P2P(Hyperswarm) 업그레이드.
ConnectionManager가 transport를 추상화하여 relay→P2P 전환이 TUI에 투명하게 동작.

### Event-Driven Internal Bus
UI ↔ ChatManager ↔ ConnectionManager 간 EventEmitter 기반 통신.
TUI 컴포넌트에서 네트워크 코드 직접 호출 금지.

### Protocol-First Design
모든 메시지를 `shared/protocol.ts`의 zod schema로 정의 + 검증.
새 메시지 타입 추가 시 반드시 shared부터 정의.

## Critical Rules

### CJK/IME Input (최우선 기술 리스크)
- 한글 IME 조합 중 입력 밀림/깨짐 절대 금지
- `string-width`로 멀티바이트 문자 폭 계산
- 채팅 입력 필드는 raw mode 대신 hybrid 접근 (raw: 네비게이션, cooked: 메시지 입력)
- 변경 시 반드시 한글 IME 테스트 (ㅎ+ㅏ+ㄴ = 한 조합 검증)

### P2P + Networking
- NAT traversal 실패율 15-30% — relay fallback은 선택이 아닌 필수
- 모든 WebSocket/TCP 연결에 application-level heartbeat (15-30초)
- 연결 끊김 시 exponential backoff + jitter로 재연결
- IP geolocation은 반드시 서버 사이드에서 처리 (클라이언트 IP 노출 금지)

### Security
- 신호 서버: 사용자 목록 응답에 IP 주소 포함 금지
- P2P 연결 수립 시에만 IP 교환 (합의된 peer 간)
- 사용자 태그: `crypto.randomBytes` 사용 (예측 불가능)
- 메시지 relay 시 서버에 메시지 저장/로깅 금지

### Distribution
- native dependency 절대 금지 (npx 호환성)
- `npm pack` 결과물 1MB 미만 유지
- 첫 화면(ASCII banner) 즉시 출력 후 async 초기화

## Planning

- 프로젝트 계획 문서: `.planning/` 디렉토리
- GSD 워크플로우 사용: `/gsd:plan-phase`, `/gsd:execute-phase` 등
- 현재 Phase: `.planning/STATE.md` 참조
- 요구사항: `.planning/REQUIREMENTS.md` (REQ-ID: IDEN, DISC, MESG, SOCL, TUI, DIST)

## Testing

- vitest로 단위 테스트
- P2P/WebSocket 테스트: mock 가능한 EventEmitter 기반 설계 활용
- CJK 입력 테스트: 한글 조합 시나리오 필수 포함
- 크로스 터미널 테스트: iTerm2, Terminal.app, Windows Terminal, GNOME Terminal
