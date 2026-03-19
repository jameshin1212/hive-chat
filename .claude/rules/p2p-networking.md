# P2P & Networking Rules

## Relay-First Architecture
- Phase 3까지 신호 서버가 메시지 relay 담당
- Phase 5에서 Hyperswarm P2P 업그레이드 추가
- ConnectionManager가 transport 추상화 — UI 레이어는 relay/P2P 구분 모름

## NAT Traversal
- P2P 직접 연결 실패율 15-30% (symmetric NAT, CGNAT)
- relay fallback은 선택이 아닌 필수 — 프로토콜 설계 시 포함
- P2P 연결 시도 후 3-5초 내 실패 시 즉시 relay 전환
- 사용자에게 에러 대신 연결 상태 표시 (direct/relay/disconnected)

## WebSocket 안정성
- application-level heartbeat: 15-30초 간격
- TCP keepalive: 30초 (`socket.setKeepAlive(true, 30000)`)
- 재연결: exponential backoff + jitter (500ms → 30s cap)
- 재연결 중 outbound 메시지 버퍼링, 연결 복구 후 재전송
- sleep/wake 감지 → 즉시 재연결 트리거

## IP Geolocation
- 반드시 서버 사이드에서 처리 (WebSocket 연결의 remote IP 사용)
- 클라이언트에서 geolocation API 직접 호출 금지
- IP → 위치 결과 캐싱 (1시간 TTL, 데스크톱 IP는 자주 안 바뀜)
- 정확도: 도시/메트로 수준 (40-75%). 1km 정밀도 약속 금지
- VPN/proxy IP 감지 시 사용자에게 경고 표시
- 기본 radius: 10km (1km은 비현실적)

## Security
- 신호 서버 사용자 목록 응답에 IP 주소 절대 포함 금지
- P2P handshake 시에만 양 peer 합의 하에 IP 교환
- 신호 서버 rate limiting: IP 기준 sliding window
- 클라이언트 보고 위치 신뢰 금지 — 서버가 IP로 판단
