# 이메일 로그인 및 서버 인증 상태

## 구현

- `/login`: 기존 폼의 이메일/비밀번호로 `signInWithPassword` 호출. SSR 브라우저 client가 쿠키를 기록한 후 안전한 내부 목적지로 전체 페이지를 이동한다. 이전 익명 화면의 Next.js prefetch/cache를 재사용하지 않고 새 서버 요청을 보낸다.
- `lib/supabase/user.ts`: 매 요청의 서버 client로 `getUser()`를 호출하여 Auth 서버가 검증한 사용자만 반환한다. React `cache`는 같은 렌더 안의 중복 호출만 줄인다. 오류 시 로그인 상태로 간주하지 않는다.
- `/mypage`: 렌더 전에 위 사용자를 확인한다. 비로그인은 `/login?next=...`으로 이동한다. 검증된 UUID와 일치하는 profiles만 publishable key + 사용자 세션 + 기존 RLS로 조회한다. 스키마/정책을 바꾸거나 프로필을 생성하지 않는다.
- Header: 서버 layout이 전달한 인증 여부로 비로그인 시 로그인 링크, 로그인 시 마이페이지 아이콘과 독립적인 로그아웃 버튼을 표시한다. 사용자 이름/드롭다운은 없다. Supabase Auth 변경 이벤트는 서버 재조회만 유발하고 클라이언트 이벤트의 user/session을 신뢰해 표시를 결정하지 않는다.
- 로그아웃: `signOut({ scope: "local" })`로 현재 브라우저 세션을 종료한다. 성공하면 `/`을 새로 로드하고 실패하면 재시도 가능한 메시지를 표시한다. 다른 기기 전체 로그아웃은 아니다.
- Callback: `exchangeCodeForSession` 과정의 모든 세션 쿠키(분할 쿠키 포함)와 verifier 삭제를 실제 redirect 응답에 기록한다. no-store 응답으로 `/auth/confirmed`에 이동한다.
- `/auth/confirmed`: 서버 `getUser()` 검증 성공 시에만 현재 로그인 상태와 쇼핑/마이페이지 링크를 표시한다. 검증 실패·세션 없음은 로그인 안내로 표시한다. 직접 URL을 방문한 경우 인증 이력을 증명할 수 없으므로 무조건 이메일 인증이 끝났다고 주장하지 않는다.
- `next`: `/`로 시작하는 내부 상대 경로만 허용한다. 외부 URL, `//`, 역슬래시, 공백/제어문자, 퍼센트 인코딩, 정규화 후 `//`가 되는 경로, 인증 callback 목적지는 거부한다. 기본 목적지는 `/mypage`다. 인코딩된 임의 검색어를 포함하는 복귀 경로는 현재 보수적으로 지원하지 않는다.

인증 상태를 서버에서 표시하므로 공통 layout을 사용하는 페이지는 동적 렌더링된다. 인증 서버 통신이 실패하면 보호 페이지에 접근시키지 않는다. getSession의 로컬 사용자나 별도 localStorage 플래그는 권한 판단에 사용하지 않는다.

## 검증과 수동 확인

개발 당시 API를 모의 처리하여 로그인 성공/실패, 중복 요청, 로그아웃 실패 복구, 서버 보호, profile UUID 필터, callback 응답의 쿠키, 세션별 완료 문구, 외부 redirect 차단을 검증했다. 테스트 파일은 이후 정리했으며 아래 수동 확인 절차를 사용한다. 모의 검증은 실제 서버가 발급한 토큰 및 이메일 링크 검증을 대체하지 않는다.

이번 작업에서 실제 테스트 회원의 비밀번호나 세션을 제공받지 않았으므로 기존 계정으로 로그인하거나 원격 회원 데이터를 변경하지 않았다. 실제 비밀번호를 테스트 코드/환경 파일/로그에 저장하지 않는다.

브라우저에서 기존 테스트 계정으로 다음을 확인한다.

1. 비로그인 `/mypage` → 로그인 화면 → 로그인 → 마이페이지 복귀.
2. 새로고침 후 마이페이지와 Header의 마이페이지/로그아웃 메뉴 유지.
3. 마이페이지에서 로그아웃 → 홈 → Header 로그인 링크 → `/mypage` 재접근 차단.
4. 새로운 이메일 인증 흐름에서 callback 응답에 Set-Cookie가 있는지 확인한 뒤 `/auth/confirmed`에서 실제 로그인 안내와 마이페이지 접근 확인. 쿠키/토큰 값은 복사하거나 공유하지 않는다.
5. 쿠키를 지운 별도 시크릿 창에서 `/auth/confirmed`를 직접 열면 로그인 안내가 나오는지 확인.
6. `/login?next=https://example.com`으로 로그인해도 `/mypage`로 이동하는지 확인.
7. Authentication Users UUID와 profiles.id가 동일한지 Dashboard에서 확인. 누락된 프로필은 이번 앱이 임의 복구하지 않는다.

추가 migration이나 OAuth 설정은 필요 없다. 기존 이메일 인증 설정과 Redirect URL은 유지한다. 약관 이력, 이름/전화번호 수정, 비밀번호 재설정, OAuth, 배송지/주문/결제는 후속 범위다.

공식 참고: [getUser](https://supabase.com/docs/reference/javascript/auth-getuser), [SSR 세션 안내](https://supabase.com/docs/guides/auth/server-side/advanced-guide).
