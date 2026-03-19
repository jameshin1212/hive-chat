---
phase: 06-chat-bug-fixes
verified: 2026-03-20T00:52:00Z
status: passed
score: 8/8 must-haves verified
re_verification: false
---

# Phase 06: Chat Bug Fixes Verification Report

**Phase Goal:** 채팅 중 입력 텍스트가 사라지거나 메시지 영역이 깨지는 문제가 해결되어 안정적으로 대화할 수 있다
**Verified:** 2026-03-20T00:52:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | 터미널 폭보다 긴 텍스트를 입력해도 현재 입력 중인 내용이 항상 보인다 | VERIFIED | `IMETextInput.tsx:145` — `getVisibleText(text, availableWidth)` 렌더링 적용 |
| 2 | 커서는 항상 입력 끝에 위치하고 텍스트가 좌로 밀린다 | VERIFIED | `getVisibleText` 후방 탐색 방식으로 끝부분 텍스트 반환, cursor indicator 렌더링 유지 |
| 3 | 한글/CJK 문자 입력 시에도 sliding window가 정확하게 동작한다 | VERIFIED | `IMETextInput.test.tsx:47-66` — CJK/혼합/경계 케이스 8개 테스트 전체 통과 |
| 4 | 메시지가 50개 이상 쌓여도 채팅 영역이 최신 메시지 방향으로 정상 스크롤된다 | VERIFIED | `MessageArea.tsx:84-85` — `calcVisibleMessages(messages, displayHeight, scrollOffset)` 사용 |
| 5 | 스크롤 후에도 상단에 이전 메시지가 고정되어 남는 현상이 발생하지 않는다 | VERIFIED | `MessageArea.tsx:96` — `height={availableHeight}` 고정 높이로 flexGrow 대체 |
| 6 | Page Up/Down으로 이전 메시지를 탐색할 수 있다 | VERIFIED | `MessageArea.tsx:73-81` — `key.pageUp` / `key.pageDown` 핸들러 구현 |
| 7 | 스크롤 중 새 메시지 도착 시 위치 유지 + 알림 표시 | VERIFIED | `MessageArea.tsx:118-122` — `scrollOffset > 0` 시 `↓ new messages` 인디케이터 렌더링 |
| 8 | ChatScreen의 메시지 버퍼가 500개로 제한된다 | VERIFIED | `ChatScreen.tsx:62,203` — 두 `setMessages` 경로 모두 `.slice(-MAX_MESSAGES)` 적용 |

**Score:** 8/8 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|---------|--------|---------|
| `packages/client/src/ui/components/IMETextInput.tsx` | Sliding window input with overflow handling | VERIFIED | `getVisibleText` export 함수 존재 (L22), `stringWidth` 사용 (L24,33), `useStdout` 연동 (L63-65) |
| `packages/client/src/ui/components/IMETextInput.test.tsx` | Tests for sliding window behavior | VERIFIED | `describe('getVisibleText')` 블록 (L38), 8개 케이스 전체 통과 |
| `packages/client/src/ui/components/MessageArea.tsx` | Scrollable message area with Page Up/Down and auto-scroll | VERIFIED | `scrollOffset` state (L56), `pageUp`/`pageDown` 핸들러 (L75-80), `availableHeight` prop (L10) |
| `packages/client/src/ui/components/MessageArea.test.tsx` | Tests for message visibility calculation | VERIFIED | `calcVisibleMessages` describe 블록, 7개 케이스 전체 통과 |
| `packages/client/src/ui/screens/ChatScreen.tsx` | Message buffer limited to 500 + height passed to MessageArea | VERIFIED | `MAX_MESSAGES` import (L4), `.slice(-MAX_MESSAGES)` 두 곳 (L62,203), `messageAreaHeight = rows - 4` (L40) |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `IMETextInput.tsx` | `string-width` | `stringWidth()` CJK-aware visible window 계산 | WIRED | L3 import, L24/33/65 사용 |
| `ChatScreen.tsx` | `MessageArea.tsx` | `availableHeight` prop | WIRED | `ChatScreen.tsx:267` — `availableHeight={messageAreaHeight}` 전달 |
| `MessageArea.tsx` | `useInput` | Page Up/Down keyboard scroll 핸들링 | WIRED | `MessageArea.tsx:73` — `useInput((_input, key) => {...}, { isActive: isActive !== false })` |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| BUG-01 | 06-01-PLAN.md | 채팅 입력이 길어지면 입력 중인 텍스트가 보이지 않는 문제 수정 | SATISFIED | `getVisibleText` + sliding window 렌더링 구현, 15개 테스트 통과 |
| BUG-02 | 06-02-PLAN.md | 메시지가 많아지면 채팅 영역 상단 일부가 고정된 채 스크롤되는 문제 수정 | SATISFIED | `calcVisibleMessages` + 고정 높이 레이아웃 + Page Up/Down, 22개 테스트 통과 |

**Orphaned requirements check:** REQUIREMENTS.md에서 Phase 6에 매핑된 요구사항 BUG-01, BUG-02 모두 계획에 포함됨. 누락 없음.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `ChatScreen.tsx` | 189 | `// Other known commands (placeholder for future phases)` | Info | Phase 03부터 존재하는 미구현 명령어 주석. Phase 06 도입 코드 아님. |
| `MessageArea.tsx` | 101 | `theme.badge[msg.from.aiCli]` TS7053 타입 에러 | Warning | Phase 03에서 도입된 pre-existing 타입 오류. Phase 06 변경과 무관. |

**TypeScript 컴파일 관련 메모:**
- `npx tsc --noEmit -p packages/client/tsconfig.json` 실행 시 `TS6305` 에러 다수 발생: `packages/shared/dist/index.d.ts` 미빌드 환경 문제. 소스 자체의 타입 오류가 아닌 빌드 파이프라인 설정 이슈이며, vitest는 정상 동작.
- `MessageArea.tsx:101` TS7053 에러: `theme.badge`가 `as const`로 선언되어 literal union 타입만 인덱스로 허용하는데, `msg.from.aiCli`가 `any`로 추론됨. Phase 03 코드이며 Phase 06 범위 밖.

---

### Test Results

```
Test Files  2 passed (2)
     Tests  22 passed (22)
  IMETextInput.test.tsx: 15 tests passed
    - calcCursorX: 7 tests
    - getVisibleText: 8 tests (ASCII, CJK, mixed, boundary, empty, zero-width)
  MessageArea.test.tsx: 7 tests passed
    - calcVisibleMessages: 7 tests (auto-scroll, scroll-up, fewer-than-height, empty, zero-height, clamp-max, clamp-min)
```

---

### Human Verification Required

#### 1. 실제 터미널에서 긴 입력 슬라이딩 동작 확인

**Test:** `npx cling-talk` 실행 후 80-column 터미널에서 100자 이상 연속 입력
**Expected:** 타이핑할수록 텍스트가 왼쪽으로 밀리며 마지막에 입력한 글자가 항상 보임
**Why human:** 터미널 렌더링과 실제 useStdout 연동은 자동화 검증 불가

#### 2. Page Up/Down 스크롤 동작 확인

**Test:** 50개 이상 메시지 후 Page Up 키 입력
**Expected:** 이전 메시지 영역으로 스크롤, 하단에 "↓ new messages" 표시
**Why human:** Ink의 useInput 키 처리는 실제 터미널 환경에서만 검증 가능

#### 3. 한글 IME 입력 중 슬라이딩 동작

**Test:** 한글을 조합하면서 입력 (ㅎ+ㅏ+ㄴ = 한, 이후 계속 입력)
**Expected:** 조합 중 문자가 깨지지 않으며, 폭 초과 시 이전 문자들이 왼쪽으로 밀림
**Why human:** IME 조합 상태와 raw mode 상호작용은 실제 환경 필수

---

### Summary

Phase 06 목표 달성 확인됨.

**BUG-01 해결:** `getVisibleText` 함수가 `string-width` 기반으로 CJK 폭을 정확히 계산하여 터미널 폭을 초과하는 텍스트의 오른쪽 부분(최신 입력)만 표시. `IMETextInput` 렌더링에 즉시 연동. 8개 테스트 전체 통과.

**BUG-02 해결:** `calcVisibleMessages` 순수 함수로 offset 기반 메시지 슬라이싱 구현. `MessageArea`가 고정 높이(`height={availableHeight}`)로 flexGrow 제거하여 레이아웃 예측 가능. Page Up/Down 키보드 네비게이션 및 스크롤 중 새 메시지 알림 인디케이터 추가. `ChatScreen`에서 `MAX_MESSAGES=500` 버퍼 제한 두 경로 모두 적용. 7개 테스트 전체 통과.

전체 22개 자동화 테스트 통과. 사람 검증이 필요한 항목 3건은 실제 터미널 환경 렌더링 관련으로 자동화 불가 영역.

---

_Verified: 2026-03-20T00:52:00Z_
_Verifier: Claude (gsd-verifier)_
