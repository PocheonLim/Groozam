import bcrypt from "bcrypt";

const NAVER_COMMERCE_BASE_URL = "https://api.commerce.naver.com/external";

type NaverTokenResponse = {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

type NaverApiError = {
  code?: string;
  message?: string;
};

export class NaverCommerceError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

function getCredentials() {
  const clientId = process.env.NAVER_COMMERCE_CLIENT_ID;
  const clientSecret = process.env.NAVER_COMMERCE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new NaverCommerceError(
      "NAVER_COMMERCE_CLIENT_ID와 NAVER_COMMERCE_CLIENT_SECRET을 .env.local에 설정해 주세요.",
      500,
    );
  }

  return { clientId, clientSecret };
}

async function getAccessToken() {
  const { clientId, clientSecret } = getCredentials();
  const timestamp = Date.now().toString();
  const hashedSignature = await bcrypt.hash(`${clientId}_${timestamp}`, clientSecret);
  const clientSecretSign = Buffer.from(hashedSignature, "utf8").toString("base64");

  const response = await fetch(`${NAVER_COMMERCE_BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      timestamp,
      client_secret_sign: clientSecretSign,
      grant_type: "client_credentials",
      type: "SELF",
    }),
    cache: "no-store",
  });

  const payload = (await response.json()) as NaverTokenResponse;

  if (!response.ok || !payload.access_token) {
    throw new NaverCommerceError(
      payload.error_description ?? payload.error ?? "네이버 인증 토큰 발급에 실패했습니다.",
      response.status,
    );
  }

  return payload.access_token;
}

export async function getNaverProducts() {
  const accessToken = await getAccessToken();
  const response = await fetch(`${NAVER_COMMERCE_BASE_URL}/v1/products/search`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ page: 1, size: 10 }),
    cache: "no-store",
  });

  const payload = (await response.json()) as unknown;

  if (!response.ok) {
    const error = payload as NaverApiError;
    throw new NaverCommerceError(
      error.message ?? error.code ?? "네이버 상품 목록 조회에 실패했습니다.",
      response.status,
    );
  }

  return payload;
}
