# Seoul DB 구조 구축 결과 — 2026-09-30

## 대상 및 범위

- `.env.local`의 새 대상과 CLI 연결이 일치함을 확인했다. 프로젝트명 `groozam-seoul`, 리전 `ap-northeast-2`, 상태 ACTIVE_HEALTHY.
- URL/key 값은 이 문서에 기록하지 않는다. 새 publishable key로 Auth 설정 읽기 요청 성공.
- 기존 Sydney는 migration 이력을 읽기만 했다. 애플리케이션 스키마·데이터·Auth 설정에 변경/삭제 명령을 실행하지 않았다.
- 회원/Auth 데이터 복사는 수행하지 않았다. 새 DB의 구조만 구축했다.
- 기존 migration 파일, `.env.local`, 앱 코드, 약관 draft/가입 차단을 수정하지 않았다.

## 이력

| 원본 migration | Sydney 확인 상태 | Seoul 적용 전 → 후 |
| --- | --- | --- |
| `20260922013649_create_member_schema.sql` | 적용됨 | 미적용 → 적용됨 |
| `20260929000000_address_write_rpc.sql` | 적용됨 | 미적용 → 적용됨 |
| `20260929010000_reassign_default_address_on_delete.sql` | 적용됨 | 미적용 → 적용됨 |
| `20260929020000_signup_consent_records.sql` | 미적용 유지 | 미적용 → 적용됨 |

Seoul에 기존 충돌 객체·사용자 Auth 트리거가 없고 Auth 회원 수가 0이며 pgcrypto가 extensions에 있음을 확인했다. dry-run으로 위 4개 목록 확인 후 기존 파일 그대로 순서대로 적용했다. `db push --skip-vault`를 사용했고 seed/roles/config push/reset/repair는 실행하지 않았다.

적용 후 `npx supabase migration list`의 Local/Remote 4개가 모두 일치하고 재 dry-run의 적용 예정 목록은 비어 있다. Sydney의 후속 읽기에서도 기존 3개 migration만 존재하며 신규 동의 RPC/private 스키마는 없다. 로컬 Docker DB migration 실행 여부를 추정하지 않았으며 CLI의 Local 열은 로컬 migration 파일 목록이다.

## 확인한 DB 구조

- public 테이블 3개: profiles, addresses, member_consents. 모두 RLS 활성.
- 함수 4개: 신규 회원 프로필 생성, updated_at 처리, 배송지 쓰기/기본 배송지 재배정, 가입 동의 기록.
- 활성 트리거 3개: Auth 회원 생성 및 프로필/주소 수정 시각.
- 본인 행 정책 7개, public PK 포함 인덱스 7개, FK/동의 CHECK 확인.
- profiles.phone nullable, member_consents.signup_record/agreed_at 및 가입 버전별 부분 유일 인덱스 확인.
- authenticated의 동의 직접 INSERT/UPDATE/DELETE 금지, anon의 동의 RPC 실행 금지, authenticated RPC 실행 허용 확인.
- groozam_private와 키 테이블에 anon/authenticated 접근 차단 확인. **후속 작업에서 키 등록 완료: singleton 행 1개, 로컬 앱과 DB의 일회용 HMAC 일치 확인.**
- 재확인 SQL: [member_schema_verify.sql](checks/member_schema_verify.sql). 읽기 전용이며 회원 데이터/키 값을 반환하지 않는다.

## Dashboard에서 다시 설정/확인

1. Authentication → URL Configuration: Site URL을 실제 운영 origin으로, Redirect URLs에 운영 `/auth/callback` 및 개발 `http://localhost:3000/auth/callback`을 등록한다. 필요한 개발 포트만 추가한다.
2. Authentication → Sign In / Providers: Email과 Confirm email 확인. 현재 공개 설정 조회에서는 Email 활성·Confirm email 활성·Supabase signup 허용으로 확인됐다. 앱의 약관 초안 가입 차단은 별개로 유지 중이다.
3. Authentication → Email: 인증 템플릿의 `{{ .ConfirmationURL }}`, Custom SMTP의 발송사·발신자·비밀값·발송 제한을 설정한다. Hooks의 Send Email Hook 사용 여부도 확인한다. Sydney 설정은 migration으로 복제되지 않는다. 실제 메일 수신은 미검증.
4. Project Settings → Data API: `groozam_private`를 Exposed schemas에 추가하지 않는다. 앱에서는 public 테이블/RPC만 사용한다.
5. SQL Editor에서 DB 소유자로 `groozam_private.consent_signing_key`에 앱의 `SIGNUP_CONSENT_SECRET`과 동일한 64자리 hex 키를 별도 등록한다. 후속 작업에서 로컬 앱 키와 동일한 DB 키 등록을 완료했다. Vercel 서버 환경은 별도 확인한다. 값은 채팅/저장소/로그에 남기지 않는다. 등록 절차는 [MEMBER_CONSENTS.md](MEMBER_CONSENTS.md)의 배포 전 필수 작업 참고. Supabase Edge Function Secrets만 설정해서는 이 Next.js 서버나 DB 테이블에 반영되지 않는다.
6. 새 프로젝트의 백업·로그 보유 정책, 네트워크 접근 및 이메일 제한을 운영 조건에 맞춰 확인한다. 서울 리전 선택만으로 지원 접근·메일 발송 등 국외 이전 검토가 완료되는 것은 아니다.

## 환경변수 이름 및 설정 위치

| 이름 | 작업 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | 로컬 변경 및 연결 확인 완료. Vercel의 필요한 배포 환경도 새 대상으로 변경 후 재배포 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 로컬 새 대상에서 동작 확인 완료. Vercel에도 새 값 적용 |
| `SIGNUP_CONSENT_SECRET` | 로컬 및 새 DB 등록·일치 확인 완료. Vercel 서버 환경에도 동일 키 설정 필요 |
| `SIGNUP_PHONE_SECRET` | 로컬 유효 형식 확인. 재생성 필수는 아니며 Vercel 서버에도 설정 필요. 교체 시 기존 전화/동의 임시 쿠키 무효화 |

`SUPABASE_ACCESS_TOKEN`/DB 비밀번호는 CLI 관리 자격증명이고 앱 런타임에 추가할 필요 없다. 현재 CLI 로그인으로 구축을 완료했다. service_role 키도 앱에 추가하지 않는다. 네이버 API 관련 설정은 이번 이전으로 변경하지 않는다.

## 검증

- 원격 카탈로그/권한 검사 및 Local/Remote migration 4개 일치: 통과.
- 새 URL/key의 Auth 설정 조회: 통과.
- `pnpm.cmd exec tsc --noEmit`, `pnpm.cmd lint`, `pnpm.cmd build`: 통과.
- `node --test tests/signup-consents.test.mjs`: 16개 통과.
- 원격 테스트 회원 생성·데이터 삭제·메일 발송·브라우저 E2E는 실행하지 않았다. 동의 키 설정은 후속 완료. 배포 환경 키·Dashboard·약관 확정 후 실제 가입/인증 동작을 별도로 확인해야 한다.

CLI 동작 근거: [Supabase migration 안내](https://supabase.com/docs/guides/deployment/database-migrations), [CLI reference](https://supabase.com/docs/reference/cli/supabase-db-push).
