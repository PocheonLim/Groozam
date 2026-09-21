import "server-only";
import bcrypt from "bcrypt";
import { cache } from "react";

const NAVER_COMMERCE_BASE_URL = "https://api.commerce.naver.com/external";

export type ChannelProduct = {
  originProductNo: number;
  categoryId?: string;
  wholeCategoryId?: string;
  name: string;
  statusType: string;
  salePrice: number;
  discountedPrice?: number;
  deliveryFee?: number;
  representativeImage?: { url?: string };
};

export type ProductSearchResponse = {
  contents: { channelProducts: ChannelProduct[] }[];
  totalPages: number;
};

export type OriginProductImage = { url?: string };

export type OriginProduct = {
  statusType: string;
  originProductNo: number;
  name: string;
  salePrice: number;
  discountedPrice?: number;
  images?: {
    representativeImage?: OriginProductImage;
    optionalImages?: OriginProductImage[];
  };
  detailContent?: string;
};

type OriginProductResponse = {
  originProduct: OriginProduct;
};

type NaverTokenResponse = { access_token?: string; error?: string; error_description?: string; message?: string };
type NaverApiError = { code?: string; message?: string };

export class NaverCommerceError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

function getCredentials() {
  const clientId = process.env.NAVER_COMMERCE_CLIENT_ID;
  const clientSecret = process.env.NAVER_COMMERCE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new NaverCommerceError("NAVER_COMMERCE_CLIENT_ID와 NAVER_COMMERCE_CLIENT_SECRET을 .env.local에 설정해 주세요.", 500);
  }
  return { clientId, clientSecret };
}

async function getAccessToken() {
  const { clientId, clientSecret } = getCredentials();
  const timestamp = Date.now().toString();
  const signature = Buffer.from(await bcrypt.hash(`${clientId}_${timestamp}`, clientSecret), "utf8").toString("base64");
  const response = await fetch(`${NAVER_COMMERCE_BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, timestamp, client_secret_sign: signature, grant_type: "client_credentials", type: "SELF" }),
    cache: "no-store",
  });
  const payload = (await response.json()) as NaverTokenResponse;
  if (!response.ok || !payload.access_token) {
    throw new NaverCommerceError(payload.message ?? payload.error_description ?? payload.error ?? "네이버 인증 토큰 발급에 실패했습니다.", response.status);
  }
  return payload.access_token;
}

export async function getNaverProducts(): Promise<ProductSearchResponse> {
  const accessToken = await getAccessToken();
  const result = await searchProducts(accessToken);
  for (let page = 2; page <= result.totalPages; page += 1) {
    const nextPage = await searchProducts(accessToken, undefined, page);
    result.contents.push(...nextPage.contents);
  }
  return result;
}

async function searchProducts(accessToken: string, originProductNo?: string, page = 1): Promise<ProductSearchResponse> {
  const response = await fetch(`${NAVER_COMMERCE_BASE_URL}/v1/products/search`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ page, size: 100, ...(originProductNo ? { searchKeywordType: "ORIGIN_PRODUCT_NO", originProductNos: [Number(originProductNo)] } : {}) }),
    cache: "no-store",
  });
  const payload = (await response.json()) as unknown;
  if (!response.ok) {
    const error = payload as NaverApiError;
    throw new NaverCommerceError(error.message ?? error.code ?? "네이버 상품 목록 조회에 실패했습니다.", response.status);
  }
  return payload as ProductSearchResponse;
}

export const getOriginProduct = cache(async (originProductNo: string): Promise<OriginProduct> => {
  const accessToken = await getAccessToken();
  const response = await fetch(`${NAVER_COMMERCE_BASE_URL}/v2/products/origin-products/${encodeURIComponent(originProductNo)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const payload = (await response.json()) as unknown;
  if (!response.ok) {
    const error = payload as NaverApiError;
    throw new NaverCommerceError(error.message ?? error.code ?? "네이버 상품 상세 조회에 실패했습니다.", response.status);
  }
  const product = (payload as OriginProductResponse).originProduct;
  const search = await searchProducts(accessToken, originProductNo);
  const channelProduct = search.contents.flatMap((content) => content.channelProducts)
    .find((channel) => String(channel.originProductNo) === originProductNo);
  return { ...product, originProductNo: Number(originProductNo), salePrice: channelProduct?.salePrice ?? product.salePrice, discountedPrice: channelProduct?.discountedPrice };
});
