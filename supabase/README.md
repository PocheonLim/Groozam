# 회원 DB migration

## 이번 작업의 범위

`migrations/20260922013649_create_member_schema.sql` 한 개에 회원 테이블, 인덱스, 트리거, SQL 권한, RLS를 정의했다. UI·인증 로직·OAuth·주문 기능은 변경하지 않았다. 원격 DB에는 아직 적용하지 않았다.

| 파일 | 역할 |
| --- | --- |
| `migrations/20260922013649_create_member_schema.sql` | 일회성 초기 migration. 트랜잭션으로 전체 적용 또는 롤백 |
| `checks/member_schema_preflight.sql` | 기존 객체·함수·Auth 트리거·RLS 확인용 읽기 전용 SQL |
| `tests/member_schema.sql` | 로컬/일회성 테스트 DB용 권한·제약·트리거 검증. 끝에서 롤백 |

## 사전 확인 결과

- 기존 `supabase/` migration, 로컬 Supabase CLI, PostgreSQL, Docker는 발견되지 않았다.
- DB 직접 연결 URL이나 Supabase 관리 API 토큰도 현재 환경에 없다. 값은 읽어 출력하지 않고 존재 여부만 확인했다.
- 현재 publishable key로 세 테이블에 `select=id&limit=0` 읽기 요청을 보냈으며 모두 HTTP 404 / `PGRST205`를 반환했다. 이 결과는 REST 스키마 캐시에 조회 가능한 테이블이 없다는 뜻이며, DB 카탈로그에 객체가 전혀 없다는 보장은 아니다.
- 따라서 적용 전 SQL Editor에서 preflight를 실행해야 한다. migration도 동일 이름의 테이블/타입/인덱스/함수/트리거가 있으면 첫 단계에서 중단한다. 기존 객체를 DROP하거나 CREATE OR REPLACE로 덮어쓰지 않는다.

## 만들어지는 구조

- `profiles.id` → `auth.users.id`, `ON DELETE CASCADE`. 이메일·비밀번호·OAuth 토큰·권한 컬럼 없음.
- `addresses.user_id` → `profiles.id`, `ON DELETE CASCADE`.
- `member_consents.user_id` → `profiles.id`, `ON DELETE CASCADE`. 회원 계정 삭제 시 이력도 함께 삭제되는 정책이다.
- 주소와 동의 ID는 PostgreSQL 내장 `gen_random_uuid()`로 생성한다.
- 인덱스: 테이블별 PK 3개, `addresses_user_id_idx`, `addresses_one_default_per_user_idx`(true 행만 유일), `member_consents_user_recorded_at_idx`.
- CHECK: 동의 종류는 terms/privacy/marketing_email/marketing_sms만 허용한다. 문서 버전은 빈 문자열/공백만으로 저장할 수 없다.

## 함수와 트리거

| 함수 | 실행 위치 | 동작 |
| --- | --- | --- |
| `groozam_handle_new_user()` | `auth.users` AFTER INSERT, `groozam_auth_user_created` | UUID만 복사해 프로필 생성, 충돌 시 아무것도 변경하지 않음 |
| `groozam_set_updated_at()` | `profiles_set_updated_at`, `addresses_set_updated_at`, BEFORE UPDATE | DB의 statement_timestamp()로 수정 시각 갱신 |

프로필 생성 함수만 SECURITY DEFINER다. 두 함수 모두 `search_path = ''`이며 일반 API 역할의 함수 직접 실행 권한을 제거했다. 공급자 metadata는 복사하지 않으므로 누락·비정상 형태 때문에 가입이 실패하지 않는다. 이름·전화번호는 가입 연동 후 별도로 입력받으면 된다.

이미 있는 Auth 회원도 프로필이 생기도록 마지막에 UUID만 백필한다. Auth 회원 데이터는 변경하지 않는다. 대량의 기존 회원이 있다면 적용 시간을 미리 검토한다. 그 외 DB 오류는 숨기지 않으므로, 권한이나 테이블을 나중에 잘못 변경하면 Auth 트리거가 가입을 실패시킬 수 있다.

## RLS와 컬럼 권한

모든 정책은 `authenticated` 역할만 대상으로 하며, 세 테이블에 RLS를 켠다.

| 테이블 | 정책 이름 | 권한/조건 |
| --- | --- | --- |
| profiles | `profiles_select_own` | SELECT: auth.uid() = id |
| profiles | `profiles_update_own` | UPDATE: 같은 USING + WITH CHECK |
| addresses | `addresses_select_own` | SELECT: auth.uid() = user_id |
| addresses | `addresses_insert_own` | INSERT: 같은 WITH CHECK |
| addresses | `addresses_update_own` | UPDATE: 같은 USING + WITH CHECK |
| addresses | `addresses_delete_own` | DELETE: 같은 USING |
| member_consents | `member_consents_select_own` | SELECT: auth.uid() = user_id |
| member_consents | `member_consents_insert_own` | INSERT: 같은 WITH CHECK |

RLS에 더해 PUBLIC/anon/authenticated의 기본 테이블 권한을 취소한 후 필요한 권한만 부여한다.

- profiles: SELECT와 `display_name`, `phone` UPDATE만 허용. 클라이언트 INSERT/DELETE 금지.
- addresses: 본인 주소 CRUD 허용. INSERT에 user_id는 필요하지만 UPDATE로 소유자를 바꾸지는 못한다.
- member_consents: SELECT와 데이터 컬럼 INSERT만 허용. UPDATE/DELETE/TRUNCATE 금지.
- 클라이언트는 UUID·생성/수정 시각·동의 기록 시각을 직접 지정하거나 바꿀 수 없다.
- 소유자·관리 권한 등 RLS 우회 권한까지 차단하는 영구 보존 저장소는 아니다. 계정의 관리 삭제는 FK에 따라 동의 이력까지 삭제한다. 탈퇴 후 감사 이력을 보존해야 한다면 운영 정책을 정한 뒤 별도 migration으로 변경해야 한다.
- 문서 버전은 현재 비어 있지 않은 문자열까지 검증한다. 실제 공개된 버전인지, 고객에게 어떤 문구를 보여줬는지는 향후 가입 연동에서 검증해야 한다.

## 기본 배송지 변경

회원당 기본 배송지는 **최대 1개**다. 기본 배송지가 0개인 상태도 허용한다. 변경 기능을 만들 때는 한 트랜잭션에서 기존 기본값을 해제한 뒤 새 기본값을 지정한다. 동시에 변경 요청이 들어와 유일성 오류가 나면 재시도/안내가 필요하다. 이번 단계에는 해당 RPC나 UI를 추가하지 않았다.

## 검증 결과와 한계

PGlite 0.5.8 / PostgreSQL 18.3의 일회성 메모리 DB에서 Supabase의 `anon`, `authenticated`, 최소 `auth.users`, `auth.uid()`를 재현해 원본 migration과 테스트 SQL을 실행했다. 실제 앱의 package.json·lockfile은 변경하지 않았다.

통과 항목: 초기 생성, 기존 회원 백필, metadata 누락/비정상 입력, FK, timestamp 트리거, 기본 배송지 중복 거부, 동의 CHECK, RLS 활성화, 본인 CRUD, 다른 UUID 및 비로그인 접근 차단, 동의 수정/삭제/시각 위조 차단, 계정 삭제 cascade, 재적용 시 안전 중단. 테스트 트랜잭션 롤백도 확인했다.

이는 원격 Supabase의 실제 Auth 서버를 실행한 통합 테스트는 아니다. 원격 카탈로그 전체와 실제 Auth 가입 흐름 검증은 적용 전/후 별도로 필요하다.

## 직접 진행할 다음 작업

1. Supabase Dashboard SQL Editor에서 **`checks/member_schema_preflight.sql`만 먼저 실행**한다. 첫 결과에서 auth.users/auth.uid/UUID 함수 존재 여부를 확인한다. 나머지 결과에 기존 객체가 있다면 삭제하지 말고 스키마·migration 이력을 먼저 비교한다. 이름이 다른 기존 Auth 트리거도 확인한다.
2. CLI와 Docker를 준비한 개발 환경에서 프로젝트 루트에 `supabase init`을 실행해 config.toml을 생성한다. 이미 생성되어 있다면 덮어쓰지 않는다. 현재 `migrations/`는 CLI 표준 위치다.
3. 로컬 검증: `supabase start`, `supabase migration up --local` 후 아래 SQL 테스트를 **로컬 DB에서만** 실행한다.

   ```sh
   psql "<LOCAL_DB_URL>" -v ON_ERROR_STOP=1 -f supabase/tests/member_schema.sql
   ```

   이 테스트는 Auth에 테스트 행을 넣었다가 롤백한다. 외부 Auth 트리거의 부수 효과까지 롤백할 수는 없으므로 운영 원격 DB에서 실행하지 않는다.

4. 원격 적용을 결정했을 때 `supabase login`, `supabase link --project-ref <PROJECT_REF>`, `supabase migration list`로 대상과 이력을 확인한다. 기존 원격 migration이 있으면 먼저 이력을 정리한다. 비밀번호나 DB URL을 코드/Git에 적지 않는다.
5. `supabase db push --dry-run`으로 이번 파일만 대기 중인지 확인하고, 문제가 없으면 `supabase db push`로 적용한다. `db reset`은 사용하지 않는다. CLI migration 이력을 유지하려면 같은 migration을 SQL Editor에서 별도로 중복 실행하지 않는다.
6. 적용 후 preflight를 다시 실행하면 테이블/RLS·함수·트리거·8개 정책을 확인할 수 있다. 이번 단계에서 회원가입/로그인 기능을 추가할 필요는 없다.

Supabase CLI가 전역 설치되어 있지 않다면 위 `supabase` 명령 대신 공식 CLI를 준비한 뒤 실행한다. 이 저장소에는 CLI나 테스트 엔진을 앱 의존성으로 추가하지 않았다.

## 참고 문서

- [Supabase 회원 데이터와 Auth 트리거](https://supabase.com/docs/guides/auth/managing-user-data)
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase migration 관리](https://supabase.com/docs/guides/deployment/database-migrations)
- [PostgreSQL 부분 인덱스](https://www.postgresql.org/docs/current/indexes-partial.html)
- [PostgreSQL 테이블·컬럼 권한](https://www.postgresql.org/docs/current/ddl-priv.html)
