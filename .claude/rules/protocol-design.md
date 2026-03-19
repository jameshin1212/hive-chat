# Protocol & Message Design Rules

## Protocol-First Principle
- 새 메시지 타입 추가 시 `packages/shared/` 먼저 정의
- 모든 메시지는 zod schema로 검증 (악의적 peer 방어)
- client와 server 양쪽에서 동일한 schema import

## Message Format
- JSON over WebSocket (signaling)
- Binary over Hyperswarm stream (P2P, Phase 5)
- 모든 메시지에 `type` 필드 필수 (enum discriminant)

## Schema 변경
- 기존 필드 제거 시 deprecated 기간 없이 제거 가능 (v1이므로)
- 새 필드 추가는 optional로 시작 (하위 호환)
- 프로토콜 버전 필드 포함 (향후 호환성)

## 메시지 저장 금지
- 서버: 메시지 relay 시 로깅/저장 절대 금지
- 클라이언트: 메시지 영구 저장 금지 — 세션 메모리만
- 메시지 버퍼는 in-memory, 프로세스 종료 시 소멸

## Identity
- 형식: `nickname#TAG` (TAG = 4자리 hex, crypto.randomBytes)
- 닉네임: 사용자 입력 (유효성 검증: 1-20자, 공백/특수문자 제한)
- TAG: 서버 발급이 아닌 클라이언트 로컬 생성
- 로컬 저장: `conf` 라이브러리 (XDG 규약)
