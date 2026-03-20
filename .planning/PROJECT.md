# HiveChat

## What This Is

AI CLI(Claude Code, Codex, Gemini, Cursor 등) 사용자들이 터미널에서 근처 사용자를 발견하고 채팅할 수 있는 CLI P2P 채팅 도구. 경량 신호 서버로 사용자 발견 + relay fallback, Hyperswarm으로 P2P 직접 연결. npm 배포(`npx hivechat`).

## Core Value

터미널을 떠나지 않고 근처 개발자들과 즉시 대화할 수 있어야 한다.

## Current State (v1.0 shipped)

- **3,500+ LOC** TypeScript (ESM-only monorepo: client/server/shared)
- **260 tests** passing (vitest)
- **Tech stack**: Ink 6 + React 19 (TUI), Hyperswarm (P2P), ws (signaling), geoip-lite, zod, conf
- **5 phases** completed: Foundation → Signaling → Relay Chat → Friends → P2P Upgrade

## Current Milestone: v1.2 Deploy & Publish

**Goal:** npm publish + Railway 서버 배포 + README 작성으로 누구나 사용 가능한 상태

**Target features:**
- npm publish (npx hivechat 즉시 실행)
- Railway 신호 서버 배포
- DEFAULT_SERVER_URL을 배포 서버로 변경
- README.md 작성 (설치/사용법/스크린샷)

## Requirements

### Validated (v1.0)

- ✓ 최초 실행 시 닉네임 설정 + 고유ID 자동 발급 — v1.0
- ✓ 사용하는 AI CLI 선택 + 뱃지 표시 — v1.0
- ✓ 터미널 TUI 스플릿 레이아웃 — v1.0
- ✓ 한글/CJK IME 입력 지원 — v1.0
- ✓ Ctrl+C / /quit 깔끔한 종료 — v1.0
- ✓ npx hivechat 즉시 실행 — v1.0
- ✓ IP geolocation 기반 위치 파악 — v1.0
- ✓ 근처 사용자 목록 (1/3/5/10km 범위 선택) — v1.0
- ✓ 온라인/오프라인 상태 실시간 표시 — v1.0
- ✓ 1:1 채팅 (서버 relay + P2P) — v1.0
- ✓ 메시지 비저장 (세션 동안만 표시) — v1.0
- ✓ nick#tag 친구추가/삭제 — v1.0
- ✓ 친구 목록 로컬 파일 저장 — v1.0
- ✓ P2P 직접 연결 + relay fallback — v1.0
- ✓ 연결 상태 색상 표시 (direct/relay/disconnected) — v1.0

### Validated (v1.0.1)

- ✓ 긴 입력 텍스트 미노출 버그 수정 — v1.0.1
- ✓ 채팅 스크롤 상단 고정 버그 수정 — v1.0.1
- ✓ 입력 커서 좌/우 화살표 이동 — v1.0.1
- ✓ 슬래시 명령어 자동완성 — v1.0.1
- ✓ 상태바 위치 변경 — v1.0.1
- ✓ 시스템 메시지 시각적 구분 — v1.0.1
- ✓ 내/상대 메시지 색상 구분 — v1.0.1
- ✓ /quit → /exit 명령어 변경 — v1.0.1

### Validated (v1.1)

- ✓ /settings 명령어 (닉네임/AI CLI 변경, 프로필 확인) — v1.1
- ✓ /chat placeholder 제거 — v1.1

### Active (v1.2)

- [ ] npm publish (npx hivechat 즉시 실행)
- [ ] Railway 신호 서버 배포
- [ ] DEFAULT_SERVER_URL 배포 서버로 변경
- [ ] README.md 작성

### Out of Scope

- 메시지 영구 저장/히스토리 — 의도적 휘발성 설계
- 웹/모바일 클라이언트 — CLI 전용
- 파일 전송 — 텍스트 메시지만
- OAuth/이메일 인증 — 익명 자동생성
- 그룹 채팅 — v2 고려

## Context

- **동기**: 재미/실험 프로젝트. 터미널 채팅이라는 컨셉 자체가 즐거움
- **사용 패턴**: CLI 사용자는 터미널 탭 하나를 채팅 전용으로 할당
- **네트워크**: 신호 서버(발견 + relay fallback) + Hyperswarm P2P 직접 연결
- **위치**: IP geolocation (도시/메트로 수준, 40-75% 정확도)
- **인증**: 닉네임#태그 자동생성, 로컬 conf 저장

## Constraints

- npm 패키지 배포, `npx hivechat` 즉시 실행
- 서버 최소화: 발견 + relay fallback만. 메시지 저장/로깅 금지
- 터미널 호환: iTerm2, Terminal.app, Windows Terminal, GNOME Terminal
- 멀티바이트: 한글, 일본어, 이모지 정상 처리

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 경량 신호 서버 + P2P 하이브리드 | 서버 부담 최소화 + 위치 발견 | ✓ Good |
| 닉네임#태그 식별 체계 | Discord 스타일, 직관적 | ✓ Good |
| IP geolocation | CLI에서 GPS 불가, IP 기반 현실적 | ✓ Good |
| 메시지 비저장 정책 | 프라이버시 + 단순화 | ✓ Good |
| Relay-first → P2P 업그레이드 | Phase 3에서 채팅 배달, Phase 5에서 P2P | ✓ Good |
| Ink 6 + React 19 TUI | CJK IME 지원, 컴포넌트 기반 | ✓ Good |
| Hyperswarm P2P | NAT traversal 내장, pure JS prebuilt | ✓ Good |
| ConnectionManager 추상화 | relay↔P2P 투명 전환 | ✓ Good |

## Known Tech Debt

- `disconnected` 이벤트 미발생 → offline 상태 표시 불가
- 클라이언트 zod 검증 미사용 (type assertion)
- Nyquist VALIDATION.md 미완료

---
*Last updated: 2026-03-20 after v1.2 milestone started*
