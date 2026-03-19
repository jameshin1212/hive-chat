# Phase 9: Settings Command - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

/settings 명령어로 프로필 확인 + 닉네임 변경 + AI CLI 변경이 가능한 설정 화면 구현. 오버레이 패턴으로 ChatScreen에 통합.

</domain>

<decisions>
## Implementation Decisions

### 설정 화면 구조
- 단독 화면: 프로필 확인 + [닉네임 변경] + [AI CLI 변경] 항목이 한 화면에 표시
- 화살표로 항목 선택 + Enter로 서브화면 진입
- Esc로 설정 화면 닫기
- UserList/FriendList와 동일한 overlay 패턴 사용

### 닉네임 변경 흐름
- 닉네임 변경 시 TAG 유지 (현재 `saveIdentity()`는 새 TAG 생성 — `updateIdentity()` 함수 신규 필요)
- NICKNAME_REGEX 동일 검증 (a-z, 0-9, -, _ / 1-16자)
- 변경 후 서버에 자동 재접속 (새 identity로 재등록)
- 다른 사용자에게 즉시 반영

### AI CLI 변경
- 기존 AiCliSelector 컴포넌트 재사용
- 변경 후 서버에 자동 재접속

### 변경 후 동작
- 시스템 메시지 표시: 'Nickname changed to newname#TAG' / 'AI CLI changed to X'
- 상태바 즉시 반영 (identity state 업데이트)
- 설정 화면 자동 닫힘 후 메인 화면 복귀

### Claude's Discretion
- 설정 화면 레이아웃 세부 디자인
- 프로필 확인 영역의 표시 형식
- 서버 재접속 시 기존 채팅 세션 처리

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Identity 관리
- `packages/client/src/identity/IdentityManager.ts` — saveIdentity(), loadIdentity(), generateTag(). updateIdentity() 신규 필요
- `packages/client/src/config/AppConfig.ts` — conf 기반 XDG 저장소

### 기존 UI 패턴
- `packages/client/src/ui/screens/OnboardingScreen.tsx` — 닉네임 입력 + AI CLI 선택 패턴 (재사용)
- `packages/client/src/ui/components/AiCliSelector.tsx` — AI CLI 선택 UI (재사용)
- `packages/client/src/ui/components/UserList.tsx` — overlay 패턴 참조

### 명령어 통합
- `packages/client/src/ui/screens/ChatScreen.tsx` — handleSubmit, overlay 렌더링 위치, overlayHeight 계산
- `packages/client/src/commands/CommandParser.ts` — COMMANDS 객체 (/settings 이미 정의됨)

### 네트워크
- `packages/client/src/hooks/useServerConnection.ts` — identity 기반 서버 접속. 재접속 로직 확인 필요

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AiCliSelector`: 화살표 키 선택 + Enter 확정 UI — AI CLI 변경에 그대로 재사용
- `IMETextInput` + `NICKNAME_REGEX`: 닉네임 입력/검증 — OnboardingScreen과 동일 패턴
- `appConfig.set('identity', identity)`: identity 저장
- UserList/FriendList overlay 패턴: visible/onClose props + useInput(isActive)

### Established Patterns
- overlay는 MessageArea와 StatusBar 사이에 렌더링
- `overlayHeight` 동적 계산으로 MessageArea 높이 조정
- `showXxx` state + `setShowXxx(false)` 닫기 패턴

### Integration Points
- `ChatScreen.tsx`: `showSettings` state 추가, handleSubmit에 `/settings` 핸들러, overlay 렌더링
- `IdentityManager.ts`: `updateIdentity(nickname?, aiCli?)` 함수 추가 (TAG 유지)
- `useServerConnection.ts`: identity 변경 시 재접속 트리거

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 09-settings-command*
*Context gathered: 2026-03-20*
