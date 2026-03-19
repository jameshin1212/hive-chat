# TUI & CJK Input Rules

## IME 처리 (최우선 기술 리스크)
- 한글 입력 시 조합 중 문자가 보이지 않거나 밀리는 현상 절대 금지
- Ink의 `useCursor` hook + `string-width`로 커서 위치 정확하게 계산
- 채팅 입력 필드: raw mode 대신 hybrid 접근 고려
  - raw mode: TUI 네비게이션, 단축키
  - cooked/line mode: 메시지 텍스트 입력
- IME 관련 코드 변경 시 반드시 한글 조합 테스트 (ㅎ+ㅏ+ㄴ=한, ㄱ+ㅏ+ㄹ+ㄱ+ㅗ+ㅈ+ㅣ=갈곳이)

## TUI 레이아웃
- 스플릿 레이아웃: 상단 메시지 영역 (스크롤) + 하단 고정 입력 영역
- 메시지 버퍼: 최대 500개 (메모리 제한), 오래된 메시지는 해제
- `process.stdout.columns` undefined 시 기본값 80 사용
- 최소 터미널 폭 60 컬럼 지원

## 터미널 호환성
- `supports-color`로 색상 depth 감지 → graceful degradation
- `is-unicode-supported`로 box-drawing 문자 지원 확인 → ASCII fallback
- 마우스 이벤트에 핵심 기능 의존 금지
- 테스트 대상: iTerm2, Terminal.app, Windows Terminal, GNOME Terminal, tmux/screen

## 문자열 폭 계산
- 모든 UI 정렬에 `string-width` 사용 (`.length` 사용 금지)
- CJK 문자 = 2 columns, ASCII = 1 column, 이모지 = 2 columns
- 닉네임 표시 시 혼합 문자(ASCII + CJK + 이모지) 정렬 테스트
