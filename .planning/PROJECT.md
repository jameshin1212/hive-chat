# Cling Talk

## What This Is

AI CLI(Claude Code, Codex, Gemini, Cursor 등) 사용자들이 터미널에서 근처 사용자를 발견하고 채팅할 수 있는 CLI 채팅 도구. 경량 신호 서버로 사용자 매칭을 하고, 실제 메시지는 P2P로 직접 전달한다. npm으로 배포하여 `npx`로 바로 사용 가능하게 한다.

## Core Value

터미널을 떠나지 않고 근처 개발자들과 즉시 대화할 수 있어야 한다.

## Requirements

### Validated

- ✓ 최초 실행 시 닉네임 설정 + 고유ID 자동 발급 — Phase 1: Foundation
- ✓ 사용하는 AI CLI 선택 + 뱃지 표시 — Phase 1: Foundation
- ✓ 터미널 TUI 스플릿 레이아웃 — Phase 1: Foundation
- ✓ 한글/CJK IME 입력 지원 — Phase 1: Foundation
- ✓ Ctrl+C / /quit 깔끔한 종료 — Phase 1: Foundation
- ✓ npx cling-talk 즉시 실행 — Phase 1: Foundation
- ✓ IP geolocation 기반 위치 파악 — Phase 2: Signaling & Discovery
- ✓ 근처 사용자 목록 (1/3/5/10km 범위 선택) — Phase 2: Signaling & Discovery
- ✓ 온라인/오프라인 상태 실시간 표시 — Phase 2: Signaling & Discovery
- ✓ 1:1 채팅 (서버 relay) — Phase 3: Relay Chat
- ✓ 메시지 비저장 (세션 동안만 표시) — Phase 3: Relay Chat

### Active

- [ ] 고유ID(닉네임#태그)로 위치 무관 친구추가/삭제
- [ ] 친구 목록 로컬 파일 저장 (세션 간 유지)
- [ ] 그룹 채팅 (근처 사용자 또는 친구 그룹)
- [ ] 메시지 비저장 — 세션 동안 터미널에 표시만
- [ ] 터미널 탭 하나를 채팅 전용으로 사용하는 TUI
- [ ] 한글/영어 등 멀티바이트 문자 입력 문제 없이 동작

### Out of Scope

- 메시지 영구 저장/히스토리 — 의도적으로 휘발성 설계
- 웹/모바일 클라이언트 — CLI 전용
- 파일 전송 — v1에서는 텍스트 메시지만
- OAuth/이메일 인증 — 익명 자동생성 방식

## Context

- **동기**: 재미/실험 프로젝트. 터미널에서 채팅한다는 컨셉 자체가 즐거움
- **사용 패턴**: CLI 사용자는 터미널을 스플릿하여 여러 탭을 사용. 그 중 하나를 채팅 전용으로 할당
- **네트워크 구조**: 경량 신호 서버가 위치 매칭 + 사용자 발견 담당, 실제 메시지는 P2P 직접 연결
- **원격 친구**: 고유ID로 친구추가 → 신호서버에서 상대방 IP 확인 → 직접 P2P 연결
- **위치**: IP geolocation으로 대략적 위치 파악 (GPS 불필요)
- **인증**: 계정 없음. 최초 실행 시 닉네임 입력 + 고유태그 자동발급. 로컬 파일에 저장
- **한글 입력**: 터미널 채팅에서 IME 조합 중인 한글이 깨지지 않아야 함. TUI 라이브러리 선정 시 핵심 고려사항

## Constraints

- **배포**: npm 패키지로 배포, `npx cling-talk`으로 즉시 실행 가능
- **서버 최소화**: 신호 서버는 위치 매칭/사용자 발견/IP 교환만 담당. 메시지 중계 안 함
- **저장 없음**: 서버에 메시지 저장 없음, 클라이언트도 메시지 영구 저장 없음
- **터미널 호환성**: 주요 터미널 에뮬레이터(iTerm2, Terminal.app, Windows Terminal, GNOME Terminal)에서 동작
- **멀티바이트**: 한글, 일본어, 이모지 등 멀티바이트 문자 정상 입력/표시

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 경량 신호 서버 + P2P 하이브리드 | 서버 부담 최소화하면서도 위치 기반 발견 가능 | — Pending |
| 닉네임#태그 식별 체계 | Discord 스타일로 직관적이고 공유하기 쉬움 | — Pending |
| IP geolocation 사용 | 데스크톱 CLI에서 GPS 불가, IP 기반이 현실적 | — Pending |
| 메시지 비저장 정책 | 프라이버시 + 구현 단순화. 세션 기반 휘발성 | — Pending |
| 익명 자동생성 인증 | 가입 장벽 제거. 재미/실험 목적에 부합 | — Pending |

---
*Last updated: 2026-03-19 after Phase 3 complete — relay chat, message exchange, reconnect verified*
