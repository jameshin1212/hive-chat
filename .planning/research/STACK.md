# Stack Research

**Domain:** CLI P2P chat tool with location-based discovery
**Researched:** 2026-03-19
**Confidence:** MEDIUM-HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Node.js | >=20 LTS | Runtime | LTS with stable WebSocket API, ESM support, required for npm distribution |
| TypeScript | ^5.7 | Type safety | CLI 도구에서 프로토콜 메시지 타입 정의 필수. strict mode 사용 |
| Ink | ^6.8.0 | TUI framework (React for terminal) | CJK IME 지원을 위한 `useCursor` hook 내장. Flexbox 레이아웃으로 채팅 UI 구성 용이. string-width로 wide character 폭 계산 가능 |
| Hyperswarm | ^4.16.0 | P2P 연결 (NAT traversal + encrypted streams) | Noise protocol 기반 E2E 암호화 내장, UDP hole-punching으로 NAT 뒤 피어 연결 해결, topic 기반 피어 발견 |
| ws | ^8.19.0 | Signaling server WebSocket | 경량, 빠름, Node.js 생태계 표준. 시그널링 서버에서 클라이언트-서버 통신용 |

**Confidence:** HIGH - Ink, Hyperswarm, ws 모두 활발히 유지보수 중이며 npm 다운로드 수가 안정적

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| geoip-lite | latest | IP 기반 위치 파악 (내장 MaxMind GeoLite DB) | 시그널링 서버에서 클라이언트 IP로 위치 조회. 외부 API 호출 없이 로컬 DB 조회로 빠름 |
| string-width | ^7.0 | 멀티바이트 문자 폭 계산 | Ink TUI에서 CJK/이모지 문자의 실제 표시 폭 계산. 커서 위치 정확도에 필수 |
| ink-text-input | latest | 텍스트 입력 컴포넌트 | 채팅 메시지 입력 필드. Ink 생태계의 표준 입력 컴포넌트 |
| conf | latest | 로컬 설정 파일 저장 | 닉네임, 고유ID, 친구 목록 등 세션 간 유지 데이터 저장. XDG 규약 준수 |
| nanoid | ^5.0 | 고유 태그 생성 | 닉네임#태그에서 태그 부분 생성. UUID보다 짧고 URL-safe |
| chalk | ^5.0 | 터미널 색상 | 메시지, 상태 표시, UI 요소에 색상 적용. Ink와 함께 사용 가능 |
| zod | ^3.24 | 메시지 스키마 검증 | P2P 프로토콜 메시지 유효성 검증. 악의적 피어 방어 |
| protomux | latest | 프로토콜 멀티플렉싱 | Hyperswarm stream 위에서 여러 채널(채팅, 상태, 제어) 다중화 |
| b4a | latest | Buffer/Uint8Array 유틸리티 | Hyperswarm topic buffer 생성 시 사용. Holepunch 생태계 표준 유틸 |
| haversine | latest | 거리 계산 | 두 좌표 간 거리 계산 (km). 근처 사용자 필터링용 |

**Confidence:** HIGH (geoip-lite, string-width, nanoid) / MEDIUM (protomux - Hyperswarm 생태계 내 표준이나 문서가 빈약할 수 있음)

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| tsdown | TypeScript 번들러 | tsup 후속. Rolldown 기반으로 빠름. ESM + CJS 동시 출력. `--isolated-declarations`로 타입 생성 |
| vitest | 테스트 | TypeScript 네이티브 지원, ESM 친화적. 빠른 실행 |
| eslint + @typescript-eslint | 린트 | TypeScript 코드 품질 보장 |
| prettier | 포매팅 | 코드 스타일 일관성 |
| tsx | 개발 시 실행 | TypeScript 파일 직접 실행. 개발 중 빠른 피드백 |

## Architecture Decision: Why Hyperswarm + Custom Signaling Server

프로젝트는 두 가지 네트워킹 레이어가 필요:

1. **Signaling Server (ws)**: 위치 기반 발견, 사용자 레지스트리, 온라인 상태 관리
2. **P2P Layer (Hyperswarm)**: 실제 메시지 전달, E2E 암호화

### Flow

```
Client A → ws → Signaling Server ← ws ← Client B
  (위치 등록, 근처 유저 조회, 친구 IP 교환)

Client A ←→ Hyperswarm (topic join) ←→ Client B
  (실제 채팅 메시지, Noise 암호화)
```

### Why Not Pure Hyperswarm?

Hyperswarm의 DHT discovery는 topic 기반이지만 **위치 기반 필터링**이 없음. 시그널링 서버가 IP geolocation으로 위치를 파악하고 거리 기반 매칭을 해야 하므로, 커스텀 서버가 필수.

### Why Not Pure WebSocket?

WebSocket만으로 P2P 채팅을 구현하면 모든 메시지가 서버를 경유. 프로젝트 요구사항인 "서버는 발견만, 메시지는 P2P" 위반.

### Why Not Raw TCP?

NAT traversal을 직접 구현하는 것은 비현실적. Hyperswarm이 UDP hole-punching, DHT 기반 릴레이를 제공하므로 이를 활용.

## Installation

```bash
# Core
npm install ink react hyperswarm ws geoip-lite

# Supporting
npm install string-width ink-text-input conf nanoid chalk zod b4a

# Dev dependencies
npm install -D typescript @types/react @types/ws tsdown vitest eslint prettier tsx
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Ink (React TUI) | blessed/neo-blessed | 절대 사용하지 말 것 (아래 "What NOT to Use" 참조) |
| Ink (React TUI) | terminal-kit | React 패러다임 불필요하고 저수준 제어가 필요한 경우. 하지만 CJK 지원이 Ink보다 불확실 |
| Hyperswarm | libp2p | 더 세밀한 프로토콜 제어가 필요하거나 브라우저 호환이 필요한 경우. 하지만 설정이 훨씬 복잡 |
| Hyperswarm | PeerJS (WebRTC) | 브라우저 P2P에 최적화. CLI 전용 프로젝트에서는 오버스펙 |
| geoip-lite | ipinfo API | 더 정확한 위치 필요 시. 하지만 외부 API 의존성 + rate limit 존재 |
| ws | socket.io | 자동 재연결, room 기능 필요 시. 하지만 시그널링에 불필요한 추상화가 많고 오버헤드 |
| tsdown | tsup | tsup이 익숙하다면 아직 사용 가능. 하지만 유지보수 중단되어 장기적으로 tsdown 권장 |
| conf | configstore | 거의 동일한 기능. conf가 더 활발히 유지보수 중 |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| blessed / neo-blessed | 사실상 유지보수 중단. CJK IME composition 지원 미흡. 최근 Node.js 버전과 호환성 문제 | Ink ^6.8.0 |
| socket.io | 시그널링에 불필요한 추상화 (room, namespace, 자동 재연결). 바이너리 크기 증가. ws가 훨씬 경량 | ws ^8.19.0 |
| WebRTC (node-webrtc/wrtc) | Node.js에서 WebRTC native 바인딩은 불안정하고 설치 문제 빈번. CLI 환경에서 브라우저 API 래핑은 오버스펙 | Hyperswarm ^4.16.0 |
| tsup | 유지보수 중단 공식 선언. tsdown 이전 권장 | tsdown |
| MaxMind GeoIP2 (유료) | 무료 프로젝트에 유료 라이선스 불필요. geoip-lite의 GeoLite DB로 충분 (도시 수준 정확도) | geoip-lite |
| fs 직접 사용 (설정 저장) | XDG 경로 처리, JSON 직렬화 등을 직접 구현하면 플랫폼 호환 이슈 | conf |

## Stack Patterns by Variant

**If NAT traversal이 불가능한 네트워크 환경 (기업 방화벽 등):**
- Hyperswarm의 릴레이 모드 활용 또는 시그널링 서버를 메시지 릴레이로 fallback
- 시그널링 서버에 간단한 메시지 프록시 기능 추가

**If 배포를 `npx`로만 한다면:**
- postinstall에서 geoip-lite DB 다운로드 시간 고려 (첫 실행 느릴 수 있음)
- 대안: 시그널링 서버에서 IP geolocation 처리 (클라이언트에 geoip-lite 불필요)

**If 그룹 채팅을 지원한다면:**
- Hyperswarm topic을 그룹 ID로 사용
- 같은 topic에 join한 모든 피어가 메시지 수신
- protomux로 1:1/그룹 채널 분리

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| ink@^6.8.0 | react@^18.0.0 | Ink 6.x는 React 18 필요 |
| hyperswarm@^4.16.0 | b4a@latest, protomux@latest | Holepunch 생태계 패키지는 상호 호환 |
| geoip-lite | Node.js >=20 | IPv4 도시 수준 조회 지원. IPv6는 도시 정보 미포함 |
| tsdown | TypeScript ^5.5 | isolated declarations 기능에 TS 5.5+ 필요 |
| ink@^6.8.0 | string-width@^7.0 | ESM only. package.json에 `"type": "module"` 필수 |

## Key Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Ink CJK IME composition 불완전 | 한글 입력 시 조합 중 문자 안 보이는 현상 | `useCursor` + `string-width` 조합 사용. Claude Code, Gemini CLI에서도 같은 문제 겪고 있어 Ink 쪽 개선 가능성 있음. 최악의 경우 커스텀 input 컴포넌트 구현 |
| Hyperswarm NAT traversal 실패 | 일부 네트워크에서 피어 연결 불가 | 시그널링 서버를 fallback 릴레이로 사용 |
| geoip-lite 정확도 한계 | IP 위치가 실제와 수 km~수십 km 차이 | 프로젝트 특성상 "대략적 위치"가 목적이므로 수용 가능. VPN 사용자는 비정확할 수 있음을 UI에 안내 |
| ESM-only 패키지 혼재 | CJS/ESM 충돌 | 프로젝트 전체를 ESM (`"type": "module"`)으로 통일 |

## Sources

- [Ink GitHub](https://github.com/vadimdemedes/ink) -- useCursor, CJK IME example 확인 (HIGH confidence)
- [Hyperswarm GitHub](https://github.com/holepunchto/hyperswarm) -- NAT traversal, topic 기반 발견, Noise 암호화 확인 (HIGH confidence)
- [ws npm](https://www.npmjs.com/package/ws) -- v8.19.0 확인 (HIGH confidence)
- [geoip-lite npm](https://www.npmjs.com/package/geoip-lite) -- GeoLite DB 정확도, IPv4/IPv6 차이 확인 (HIGH confidence)
- [tsdown official site](https://tsdown.dev/) -- tsup 대체, Rolldown 기반 확인 (MEDIUM confidence - 비교적 새로운 도구)
- [Claude Code Korean IME issues](https://github.com/anthropics/claude-code/issues/22732) -- Ink 기반 앱의 한글 IME 문제 실제 사례 확인 (HIGH confidence)
- [Gemini CLI Korean IME issues](https://github.com/google-gemini/gemini-cli/issues/3014) -- 터미널 IME 문제가 Ink 특정이 아닌 범용 문제임을 확인 (HIGH confidence)
- [PCChat (Hyperswarm chat)](https://github.com/Niximkk/PCChat) -- Hyperswarm 기반 P2P 채팅 실제 구현 사례 (MEDIUM confidence)

---
*Stack research for: Double Talk - CLI P2P chat tool with location-based discovery*
*Researched: 2026-03-19*
