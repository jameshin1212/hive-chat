# Monorepo Conventions

## Package Structure
```
packages/
  client/     # npm 배포 대상 CLI 앱
  server/     # 경량 신호 서버
  shared/     # Protocol types + zod schemas + constants
```

## Import Rules
- client → shared: OK
- server → shared: OK
- client → server: 금지
- server → client: 금지
- shared → client/server: 금지 (shared는 독립적)

## ESM-Only
- 모든 패키지 `"type": "module"`
- import 시 `.js` 확장자 포함 (TypeScript에서도)
- `require()` 사용 금지

## TypeScript
- `strict: true` 필수
- `noUncheckedIndexedAccess: true` 권장
- shared 패키지: declaration 파일 생성 (`--isolated-declarations`)

## Dependencies
- native dependency 절대 금지 (npx 호환성)
- 새 dependency 추가 시:
  1. pure JS/TS인지 확인
  2. ESM 지원하는지 확인
  3. bundle size 영향 확인
- client의 최종 번들: 단일 파일 (tsdown)

## Testing
- vitest (ESM 네이티브 지원)
- 테스트 파일: `*.test.ts` (co-located with source)
- shared 패키지 테스트: schema 검증 + 타입 호환성
- client 테스트: EventEmitter mock으로 네트워크 분리

## Commits
- `feat(client):`, `fix(server):`, `refactor(shared):` 형식
- scope는 패키지명 사용
