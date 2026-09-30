# 회원가입 동의 기록

## 현재 상태 / 배포 전 필수 작업

**이번 migration은 원격 DB에 적용하지 않았습니다.** 문서 4개 모두 `lib/legal/documents.ts`에서 draft / version=null 상태이며 임의로 활성화하지 않았습니다. 사용자 결정에 따라 초안 상태의 신규 가입은 UI와 서버에서 차단합니다. 기존 로그인·프로필·배송지는 그대로 사용합니다.

2026-09-29 제공된 실제 사업자·배송·반품 정보를 문서 본문에 반영했습니다. 버전 후보는 `2026-09-29.r1`이지만 미확정 개인정보 처리·위탁·마케팅 철회 항목이 남아 있습니다. 확정 전 확인 목록과 법령 근거는 [LEGAL_RELEASE_REVIEW.md](./LEGAL_RELEASE_REVIEW.md)를 참고하세요. 본문 보강만으로 활성화하거나 가입 차단을 해제하지 않습니다.

활성화 순서:

1. 아래 migration과 변경점을 검토합니다. 연결된 Supabase 프로젝트 및 다른 미적용 migration 목록을 확인한 뒤 `20260929020000_signup_consent_records.sql`을 적용합니다. 기존 migration을 다시 실행하거나 수정하지 않습니다.
2. 암호학적으로 무작위인 32바이트(64자리 hex) 전용 키를 준비합니다. 예: 로컬 터미널에서 `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. 결과를 채팅·Git·클라이언트 코드에 넣지 마세요.
3. 앱의 서버 환경변수 `SIGNUP_CONSENT_SECRET`에 그 키를 설정합니다. 기존 `SIGNUP_PHONE_SECRET`은 유지합니다. `NEXT_PUBLIC_` 접두사를 붙이지 않습니다. 로컬은 `.env.local`, 배포 환경은 서버 환경변수를 설정하고 재시작/재배포합니다.
4. Supabase SQL Editor에서 DB 소유자 권한으로 아래 SQL의 placeholder를 같은 키로 바꿔 **한 번만** 실행합니다. 비밀값을 포함한 SQL 파일을 저장소에 커밋하지 않습니다. SQL Editor 기록 접근 권한도 관리하세요.

   ```sql
   insert into groozam_private.consent_signing_key(singleton, secret)
   values (true, '<SIGNUP_CONSENT_SECRET과 동일한 64자리 hex>');
   ```

5. `groozam_private` 스키마는 Supabase API의 Exposed schemas에 추가하지 않습니다. 함수는 제한된 SECURITY DEFINER 권한으로 키를 읽으며 브라우저 역할은 스키마/키에 접근할 수 없습니다.
6. 실제 승인된 이용약관, 필수 개인정보 수집·이용 안내, 이메일/SMS 마케팅 안내를 확정합니다. `documents.ts`의 실제 내용·status·version·effectiveDate를 설정합니다. 형식은 `YYYY-MM-DD.rN`, 기존 확정 버전은 바꾸지 않습니다. 네 문서 중 하나라도 초안이면 가입은 차단됩니다.
7. 아래 실브라우저 확인을 완료한 뒤 신규 가입을 공개합니다. 서명키는 한 개만 지원하므로 교체 시 앱/DB를 함께 변경해야 합니다. 암호화는 기존 전화번호 키에서 별도 HKDF 키를 파생하므로 전화번호 키 교체 시 남아 있는 동의 쿠키도 무효화됩니다.

## 항목 및 버전

| consent_type | 필수 여부 | 저장 값 |
| --- | --- | --- |
| terms | 필수 | true |
| privacy | 필수 | true |
| marketing_email | 선택 | true 또는 false |
| marketing_sms | 선택 | true 또는 false |

전체 동의 자체는 저장하지 않습니다. 문서 버전은 `lib/legal/documents.ts`가 원본입니다. 화면에 표시된 버전과 서버 버전이 다르면 새로고침을 요구하고 signUp을 호출하지 않습니다. 가입 요청 시 서버 버전을 스냅샷으로 고정하므로 인증 전 문서가 개정되어도 **가입 당시 버전**이 기록됩니다.

## 가입 → 인증 → 저장

1. `MemberForm`이 이메일/비밀번호/전화번호/개별 체크 상태/화면 버전을 Server Action `signupWithConsents`로 전달합니다. 기존 로그인 경로는 변경하지 않습니다.
2. 서버가 필수 동의, 자격 정보, 전화번호, 문서 활성화/버전, 서명·암호화 설정을 검증합니다. 필수 동의 누락 시 Supabase signUp을 호출하지 않습니다. 서버 SSR 클라이언트가 signUp을 호출하며 PKCE verifier는 기존 쿠키 어댑터로 브라우저에 전달됩니다. callback 목적지는 동일 요청 origin의 고정 `/auth/callback`이고 Next.js의 Server Action 출처 검사를 유지합니다.
3. 전화번호는 기존 전화번호 쿠키/유틸리티를 그대로 사용합니다. 동의는 별도 AES-256-GCM HttpOnly 쿠키에 보관합니다. Secure(production), SameSite=Lax, Path=/, 만료 1시간입니다. 이메일·Auth 응답 UUID·개별 선택·버전·서버 동의 접수 시각을 암호화하며 비밀번호는 포함하지 않습니다. 기존 회원을 가린 응답(빈 identities)은 새 동의 쿠키로 확정하지 않습니다.
4. callback은 기존 PKCE 교환 후 전화번호와 동의를 각각 처리합니다. 동의는 getUser()의 인증 완료 이메일/UUID와 쿠키를 대조합니다. Auth 응답 UUID만 신뢰하지 않습니다.
5. 서버가 검증한 스냅샷 원문을 전용 키로 HMAC-SHA256 서명하여 RPC에 보냅니다. DB도 서명, 만료, auth.uid(), auth.users의 인증 완료 이메일을 검증합니다. 브라우저가 직접 RPC를 호출해도 서버 서명 없이 임의의 버전/선택값을 저장할 수 없습니다.
6. 4개 이력은 하나의 트랜잭션에서 저장합니다. 성공하면 동의 쿠키를 제거합니다. Confirm Email OFF로 즉시 세션을 반환하는 환경도 동일한 저장 경로를 사용합니다.
7. 실패해도 이메일 인증 성공/세션을 취소하지 않고 `/auth/confirmed`에서 안내합니다. 유효한 본인 쿠키가 있으면 재시도 버튼을 표시합니다. 전화번호 저장 실패와 동의 저장 실패는 독립적으로 처리합니다. 로그에는 상태/DB 오류 코드만 남기고 이메일·전화번호·서명·토큰·payload를 출력하지 않습니다.

## DB 변경과 이력 보존

2026-09-30: 가입 전화번호는 선택이며 빈 값일 때 전화 쿠키를 제거하고 인증 후 전화 저장을 건너뜁니다. 전화 유무와 `marketing_sms` 선택은 서로 독립적입니다. 이름은 가입 필수로 Auth metadata에 전달하여 인증 후 빈 프로필 이름에만 반영합니다. 동의 쿠키·RPC·migration은 변경하지 않았습니다.

### 후속 마케팅 설정 설계 (이번에는 미구현)

`signup_record=true` 행은 가입 당시 증빙입니다. UPDATE/DELETE하지 않고 그대로 보존합니다. 현재 발송 여부는 가입 이력과 구분해야 합니다. 최소안은 기존 `member_consents`에 `signup_record=false`인 채널별 철회/재동의 이벤트를 서버 검증 RPC로 추가하고 서버 기록 시각·안정적인 순서 기준으로 최신 상태를 조회하는 방식입니다. 새 RPC/권한 검토가 필요하고 가입용 RPC를 재사용해서 임의 철회 이력을 만들면 안 됩니다.

조회량이 늘면 `marketing_preferences`(user_id, channel, granted, changed_at, source_event_id) 같은 현재 상태 테이블을 이벤트 추가와 같은 트랜잭션에서 갱신하는 방안을 검토합니다. 가입 시 초기화/중복 요청/동시 변경/철회 우선 처리 기준도 함께 설계합니다. 발송 시 현재 true 상태와 유효한 회원 연락처를 각각 확인하고, 배송 수령인 번호는 사용하지 않습니다. 연락처 입력·수정만으로 동의를 true로 바꾸지 않습니다. 설정 UI·발송·신규 테이블·migration은 이번 범위에 포함하지 않습니다. 증빙 보유/탈퇴 정책은 LEGAL_RELEASE_REVIEW.md에서 별도로 확정합니다.

- `member_consents`에 `signup_record boolean default false`, `agreed_at timestamptz` 추가. 기존 행은 false/null로 유지하며 삭제·중복 정리·과거 시각 추정은 하지 않습니다.
- `recorded_at`은 기존 DB 저장 시각을 유지하고, `agreed_at`은 서버가 가입 제출을 접수한 시각입니다. 실제 체크박스를 누른 시각으로 주장하지 않습니다.
- 가입 행에만 `(user_id, consent_type, document_version)` partial unique index 적용. 재시도는 ON CONFLICT DO NOTHING이며 과거 granted/시각을 덮어쓰지 않습니다. 기존 행과 선택값이 충돌하면 전체 요청이 실패하고 사용자에게 재시도 안내가 표시됩니다.
- 다른 버전은 새 행을 추가합니다. 나중의 수신 철회/재동의는 별도 서명된 append-only 이벤트 경로를 설계하여 `signup_record=false`로 남길 수 있습니다. 이번 단계에 변경/재동의 UI는 없습니다.
- 기존 본인 SELECT RLS 유지. authenticated의 직접 INSERT 컬럼 권한과 INSERT 정책 회수. UPDATE/DELETE 권한은 원래 없으며 추가하지 않았습니다.
- `groozam_private.consent_signing_key`와 RPC `groozam_record_signup_consents(text,text)` 추가. SECURITY DEFINER가 필요한 이유는 브라우저에 비밀키 읽기나 직접 쓰기를 허용하지 않기 위해서입니다. search_path는 빈 값이고 모든 테이블은 스키마를 명시합니다. anon 실행은 금지합니다.
- pgcrypto가 extensions 스키마에 필요합니다. 다른 스키마에 이미 설치된 경우 migration이 중단되므로 먼저 검토해야 합니다. IP/User-Agent/기기 정보는 수집하지 않습니다.
- 기존 FK `profiles` 삭제 시 cascade는 유지합니다. 탈퇴 시 법적 보존 정책은 별도로 정해야 합니다.

## 자동 검증

```text
node --test tests/signup-consents.test.mjs
node node_modules/typescript/bin/tsc --noEmit
node node_modules/eslint/bin/eslint.js
node node_modules/next/dist/bin/next build
```

로컬 DB 검증용 엔진은 앱 의존성이 아닙니다. 임시 설치 후 실제 PostgreSQL에서 원본 migration을 실행합니다. build는 `.next`를 정리할 수 있으므로 DB 검증을 먼저 실행하세요.

```text
npm install --prefix .next/consent-db-check --no-save --package-lock=false @electric-sql/pglite
node tests/signup-consents-db.mjs
```

자동 확인: 필수 누락/초안/오래된 버전 가입 차단, 선택 false 가입, 암호화·서명·변조·만료, 계정 매칭, 저장 실패 후 재시도, 기존 전화번호 쿠키 저장, 원본 migration 적용, 기존 데이터 보존, 원자적 저장, 중복/충돌 처리, 버전별 이력 보존, 타인 RLS, 직접 쓰기/비밀키/anon 접근 차단. 임시 DB 데이터는 가상 데이터이며 원격 계정을 만들지 않습니다.

## 직접 확인

1. 현재 draft 상태에서는 가입 버튼/서버 요청이 차단되는지 확인합니다. 기존 로그인과 마이페이지·배송지는 정상 이용되어야 합니다.
2. 개발 환경에서 승인 문서와 위 설정 적용 후 필수만 동의하여 가입합니다. 같은 브라우저에서 1시간 안에 인증 링크를 엽니다.
3. 본인 profiles.phone이 저장되고 member_consents에 4행이 생성되는지 확인합니다. 필수 true, 선택 false, 가입 당시 문서 버전, agreed_at/recorded_at을 확인합니다.
4. 선택 항목을 다르게 체크한 새 테스트 계정에서도 각각의 선택값이 보존되는지 확인합니다. 테스트 계정은 임의 삭제하지 않습니다.
5. 완료 URL 재방문과 저장 재시도에서 행 수/과거 값이 변하지 않아야 합니다. PKCE 코드는 일회용이므로 사용한 인증 링크 자체를 재사용하면 기존 인증 오류 안내가 나올 수 있습니다. 이미 생성된 동의 이력은 중복되지 않습니다.
6. 개발 환경에서 RPC/키 설정을 일시적으로 사용할 수 없게 하여 인증 성공·동의 저장 실패 안내를 확인하고, 설정 복구 후 쿠키 만료 전에 재시도합니다. 실제 운영 키를 테스트 목적으로 변경하지 마세요.
7. 쿠키가 없거나 위조/만료되었으면 임의 이력을 만들지 않고 안내해야 합니다. 기존 사용자 동의 기록이 없다고 자동 true를 기록하지 않습니다.

## 약관 개정과 한계

개정 전 문서 본문을 버전별로 별도 보존하세요(저장소 이력만으로 운영상 충분한지 검토 필요). 승인된 새 버전과 시행일을 중앙 문서에 설정하고 재배포하면 신규 가입부터 새 버전이 사용됩니다. 이미 생성한 쿠키/DB 이력은 이전 버전을 유지합니다. 기존 회원의 재동의 UI는 후속 작업입니다.

다른 기기/브라우저, 쿠키 소실·만료, 다중 탭에서 마지막 가입 요청으로 쿠키 덮어쓰기 시 자동 복구할 수 없습니다. 계정 자체는 유지하고 안내하며, 실제 문서를 보여 주는 재동의 복구 화면은 후속 과제입니다. 현 단계 고객지원 안내에 구체적인 연락처는 임의로 만들지 않았습니다. 원격 이메일 인증 E2E, 실제 배포 환경, 다중 DB 연결 부하 검증은 미실행입니다.
