# 이메일 회원가입 연결

회원가입 폼 → 입력 검증 → 브라우저 SSR client의 `auth.signUp` → Auth가 UUID 생성 → 기존 DB trigger가 `profiles.id` 생성 → 이메일 확인 안내 순서다. 앱은 profiles를 INSERT하지 않는다.

이름 입력은 비활성화했다. 전화번호 입력은 기존 폼에 없다. Confirm email이 켜져 있으면 인증 전 세션이 없어 profile UPDATE와 member_consents INSERT를 하지 않는다. 약관은 체크 여부만 검증하고 문서 버전이나 이력을 저장하지 않는다. 실제 약관 공개와 인증 후 동의 기록은 정식 서비스 전 후속 작업이다.

## Dashboard 설정

- Authentication에서 이메일 가입 허용 및 **Confirm email** 활성화 확인.
- URL Configuration의 Site URL은 실제 서비스 origin으로 설정. Redirect URLs에 개발용 `http://localhost:3000/auth/callback`과 실제 운영 origin의 `/auth/callback`을 각각 등록한다. 다른 개발 포트를 쓰면 해당 주소도 등록한다. 운영 주소는 코드에 하드코딩하지 않는다.
- Confirm signup 이메일 템플릿은 Supabase의 `{{ .ConfirmationURL }}` 링크를 사용한다. token_hash를 직접 앱에 전달하는 별도 템플릿 흐름은 이번 구현 범위가 아니다.
- 이메일 발송 설정, 발송 제한, 테스트 수신자 허용 범위를 확인한다. 필요하면 Custom SMTP를 설정한다.

## Callback

가입 시 현재 브라우저 origin의 `/auth/callback`을 emailRedirectTo로 전달한다. SSR SDK가 PKCE verifier를 쿠키에 보관하며 callback의 서버 client가 `code`를 `exchangeCodeForSession`으로 교환하고 세션 쿠키를 기록한다. 따라서 가입한 기기/브라우저에서 이메일 링크를 열어야 한다.

성공은 `/auth/confirmed`, 실패는 `/signup?error=confirmation`으로 이동한다. next/redirectTo 값은 사용하지 않으며 응답은 no-store다. 후속 로그인 작업에서 완료 페이지에 서버 사용자 검증을 추가했다. 로그인·로그아웃·마이페이지 보호의 현재 동작은 [EMAIL_LOGIN.md](./EMAIL_LOGIN.md)를 참고한다.

이미 가입된 이메일은 Supabase 설정에 따라 오류 또는 가려진 성공 응답을 받는다. 성공 화면은 메일 발송이나 새 계정 생성을 단정하지 않는다. 네트워크와 서비스 오류는 한국어로 안내하고 로그에는 고정 문구와 HTTP 상태만 남긴다.

## 검증

`node --test tests/signup.test.cjs`는 입력값, 중복 제출, 가려진 성공 응답, 로그인/재설정 미연결, callback 성공/실패/네트워크 오류, 외부 목적지 무시를 모의 테스트한다. 실제 Supabase 계정 생성이나 메일 수신을 검증하는 테스트는 아니다.

실제 개발 프로젝트 확인은 수신 가능한 본인 이메일로 가입 후 같은 브라우저에서 인증 링크를 연다. Dashboard Authentication → Users의 UUID와 Table Editor → profiles.id가 일치하는지 확인한다. 이름/전화번호는 비어 있고 member_consents에는 이번 가입으로 행이 생성되지 않는 것이 현재 동작이다. 테스트 계정은 자동 삭제하지 않는다.

참고: [signUp](https://supabase.com/docs/reference/javascript/auth-signup), [PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow), [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).
