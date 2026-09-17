# GROOZAM Project Instructions

## 1. Project

GROOZAM 공식 자사몰 웹사이트.

목표:

* 가구 브랜드 GROOZAM의 공식 쇼핑몰 구축
* 브랜드 이미지와 상품 판매 경험을 함께 제공
* 모바일/데스크톱 반응형 지원
* SEO를 고려한 구조
* 혼자 개발하고 장기간 유지보수하기 쉬운 구조

## 2. Tech Stack

* Next.js (App Router)
* React
* TypeScript
* Tailwind CSS
* pnpm
* Vercel

향후 필요에 따라:

* Supabase
* 결제 API
* 상품/주문 관리 시스템

Spring Boot, Express 등의 별도 백엔드는 현재 사용하지 않는다.

## 3. Development Principles

### Simplicity First

불필요하게 복잡한 구조를 만들지 않는다.

작은 기능에는 작은 구현을 사용한다.

새로운 라이브러리를 추가하기 전에:

1. 현재 기술 스택으로 해결할 수 있는지 확인
2. 꼭 필요한 경우에만 추가

### Existing Structure

기존 프로젝트 구조와 코드를 최대한 존중한다.

기능을 추가할 때 기존 파일을 불필요하게 대규모 수정하지 않는다.

작업 범위를 벗어난 리팩터링을 하지 않는다.

### TypeScript

TypeScript를 기본으로 사용한다.

가능하면 `any`를 사용하지 않는다.

컴포넌트의 props와 데이터 구조는 명확하게 타입을 정의한다.

### React / Next.js

Next.js App Router를 사용한다.

Pages Router를 사용하지 않는다.

가능하면 Server Component를 기본으로 사용한다.

브라우저에서 상호작용이 필요한 경우에만 `"use client"`를 사용한다.

Next.js의 공식적인 최신 패턴을 우선한다.

## 4. Styling

Tailwind CSS를 기본 스타일링 방법으로 사용한다.

가능하면 별도의 CSS 파일을 만들지 않는다.

`globals.css`에는 전역적으로 필요한 스타일만 작성한다.

예:

* Tailwind import
* 전역 CSS 변수
* 전역 reset
* typography 등 정말 전체에 적용되어야 하는 스타일

컴포넌트의 일반적인 스타일은 Tailwind className으로 작성한다.

예:

```tsx
<header className="flex items-center justify-between border-b px-10">
```

## 5. UI Direction

GROOZAM은 가구 브랜드이므로 다음 디자인 방향을 유지한다.

* 미니멀
* 차분함
* 따뜻함
* 고급스러움
* 여백을 충분히 사용
* 과도한 애니메이션 사용 금지
* 과도한 색상 사용 금지
* 제품 사진이 중심이 되는 디자인

UI는 기능보다 브랜드 경험을 우선적으로 고려한다.

## 6. Component Structure

재사용 가능한 UI는 컴포넌트로 분리한다.

예:

```text
app/
├── components/
│   ├── Header.tsx
│   ├── Footer.tsx
│   └── ...
├── shop/
├── about/
├── journal/
├── page.tsx
├── layout.tsx
└── globals.css
```

페이지에만 사용되는 간단한 UI까지 무조건 컴포넌트로 분리하지 않는다.

## 7. Routing

Next.js App Router의 파일 기반 라우팅을 사용한다.

예:

```text
/              → Home
/shop          → Shop
/about         → About
/journal       → Journal
/cart          → Cart
```

상품 상세 페이지는 향후:

```text
/shop/[slug]
```

형태를 사용한다.

## 8. Images

상품 이미지는 매우 중요한 요소다.

이미지에는 가능한 경우 Next.js `Image` 컴포넌트를 사용한다.

```tsx
import Image from "next/image";
```

이미지의 비율과 크기를 고려하여 레이아웃을 설계한다.

## 9. Accessibility

기본적인 웹 접근성을 지킨다.

* 이미지에는 적절한 `alt`
* 버튼에는 명확한 목적
* 링크와 버튼의 역할을 구분
* heading 구조를 적절하게 사용
* 키보드 사용을 고려

페이지 이동에는 `Link`를 사용한다.

동작을 실행하는 요소에는 `button`을 사용한다.

## 10. SEO

Next.js Metadata API를 사용한다.

페이지별로 적절한:

* title
* description

을 설정한다.

상품 페이지는 향후 상품명과 설명을 기반으로 동적인 metadata를 구성한다.

## 11. Git

작업 후 변경사항을 확인한다.

```bash
git status
```

불필요한 파일이 커밋되지 않았는지 확인한다.

커밋 메시지는 작업 내용을 명확하게 작성한다.

예:

```text
feat: add product detail page
style: improve header layout
fix: mobile navigation issue
```

## 12. Commands

개발 서버:

```bash
pnpm dev
```

Production build:

```bash
pnpm build
```

Lint:

```bash
pnpm lint
```

## 13. Agent Behavior

작업하기 전에 현재 코드와 프로젝트 구조를 먼저 확인한다.

사용자가 요청하지 않은 기능을 임의로 추가하지 않는다.

기존 UI를 임의로 크게 변경하지 않는다.

파일을 삭제하기 전에 해당 파일이 사용되고 있는지 확인한다.

새로운 패키지를 설치하기 전에 사용자에게 필요한 이유를 설명하거나 기존 기술로 해결 가능한지 먼저 판단한다.

한 번에 너무 많은 파일을 변경하지 않는다.

변경 후 TypeScript 오류와 lint 오류가 없는지 확인한다.

## 14. User Preference

사용자는 개발을 배우면서 직접 프로젝트를 구축하고 있다.

따라서 단순히 코드를 생성하는 것보다 중요한 변경사항에는 짧게 이유를 설명한다.

설명은 초보자가 이해할 수 있도록 간단하고 직접적으로 작성한다.

불필요하게 장황한 설명을 하지 않는다.

코드 구조를 과도하게 추상화하지 않는다.

"일단 동작하는 간단한 구현 → 필요할 때 확장"을 기본 원칙으로 한다.

## 15. Naver Commerce API

네이버 커머스 API의 인증 토큰을 발급할 때는 다음 표준 스펙을 반드시 준수한다.

* Request 헤더 `Content-Type`: `application/x-www-form-urlencoded`
* Request Body: `x-www-form-urlencoded` 형식
* `grant_type`: 항상 `client_credentials`

위 규칙을 지키지 않으면 API 호출량이 제한될 수 있으며, 신규 앱은 오류를 반환할 수 있다.

API 자격 증명은 코드나 Git에 포함하지 않는다. 로컬 환경 변수로만 관리하며, 서버 측에서만 네이버 API를 호출한다.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
