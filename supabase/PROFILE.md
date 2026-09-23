# 회원정보 연결

`/mypage?section=profile`에서 인증 이메일을 읽기 전용으로 표시하고 이름·휴대전화를 수정한다. 기존 getCurrentUser의 서버 Auth 검증 및 profiles 조회를 재사용한다.

저장은 Server Action에서 다시 인증하고 서버가 확인한 user.id로만 UPDATE한다. 요청에서 id/user_id/email/created_at/updated_at을 받더라도 사용하지 않는다. 갱신 필드는 display_name과 phone 두 개뿐이다. publishable key + 사용자 세션으로 기존 RLS/컬럼 권한을 적용하며 profile 누락은 오류 안내만 한다. INSERT/upsert나 Auth 수정은 하지 않는다. updated_at은 기존 DB trigger에 맡긴다.

이름은 앞뒤 공백 제거, 최대 50자, 제어문자/줄바꿈 거부. 휴대전화는 01012345678 또는 010-1234-5678을 허용하고 숫자 11자리로 저장한다. 화면에는 하이픈을 붙인다. 둘 다 선택 입력이며 빈 값은 null로 저장한다. 이는 전화번호 형식 검증이며 번호 소유자 인증은 아니다.

인증 완료 화면은 서버 세션이 있고 기존 프로필의 이름이나 휴대전화가 비어 있을 때 회원정보 입력 링크를 추가한다. 쇼핑 이동을 막지 않는다.

## 약관 기록 보류

실제 이용약관/개인정보/마케팅 문서와 document_version은 현재 없다. `lib/supabase/consents.ts`는 필수 terms/privacy, 선택 marketing_email/marketing_sms 및 아직 미정인 문서(null)를 구분하는 준비 구조다. DB INSERT 경로는 연결하지 않았다. 가짜 버전/이력이나 migration을 생성하지 않았다.

현재 가입 화면에는 이용약관과 개인정보 동의가 하나의 필수 체크박스로 묶여 있고 마케팅 체크박스는 없다. 기존 검증은 유지하되 실제 이력으로 간주하지 않는다. 문서가 마련되면 각각의 문서·서버 관리 버전을 표시하고 구분된 동의를 받는 단계가 필요하다.

권장 후속 저장 시점은 이메일 인증 후 서버가 사용자를 검증한 시점이다. 공개 문서를 다시 보여주고 명시적으로 동의를 받은 후, 서버가 선택한 실제 버전과 인증된 UUID로 append-only INSERT한다. 인증 전 체크 상태를 localStorage에서 가져와 동의 이력으로 확정하지 않는다. 가입 시점 기록이 꼭 필요하면 별도의 검증 가능한 일회성 전달 설계가 필요하다. 철회도 UPDATE/DELETE 대신 새 false 행을 추가해야 한다.

## 직접 확인

1. 로그인 후 회원정보에서 이름·번호 저장, 새로고침 후 유지 확인.
2. 빈 값 저장 시 null, 잘못된 전화번호 입력 시 오류 확인.
3. 저장 전후 Dashboard profiles.updated_at 변경 확인.
4. 서로 다른 테스트 계정이 각자의 프로필만 조회/수정 가능한지 확인.
5. 로그아웃 후 /mypage 차단, 신규 인증 후 프로필 입력 링크 및 쇼핑 계속하기 확인.

원격 DB의 실제 계정으로 저장/트리거 실행을 자동 검증하지 않았으며 실제 사용자 데이터를 변경하지 않았다. 기존 auth 테스트 파일은 이전 요청으로 삭제되어 재실행할 수 없다. 새 검증은 임시 파일에서 수행하며 프로젝트에 테스트 디렉터리를 다시 추가하지 않는다.

참고: [Supabase UPDATE와 결과 반환](https://supabase.com/docs/reference/javascript/update).
