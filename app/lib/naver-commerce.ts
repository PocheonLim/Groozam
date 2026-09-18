import "server-only";
import bcrypt from "bcrypt";

const NAVER_COMMERCE_BASE_URL = "https://api.commerce.naver.com/external";

export type SellerTag = { code?: string; text?: string };

export type ChannelProduct = {
  originProductNo: number;
  channelProductNo: number;
  channelServiceType: string;
  categoryId: string;
  name: string;
  statusType: string;
  channelProductDisplayStatusType: string;
  salePrice: number;
  discountedPrice?: number;
  mobileDiscountedPrice?: number;
  stockQuantity: number;
  deliveryAttributeType?: string;
  deliveryFee?: number;
  returnFee?: number;
  exchangeFee?: number;
  sellerPurchasePoint?: number;
  sellerPurchasePointUnitType?: string;
  managerPurchasePoint?: number;
  textReviewPoint?: number;
  photoVideoReviewPoint?: number;
  regularCustomerPoint?: number;
  representativeImage?: { url?: string };
  brandName?: string;
  manufacturerName?: string;
  wholeCategoryName?: string;
  wholeCategoryId?: string;
  sellerTags?: SellerTag[];
  regDate?: string;
  modifiedDate?: string;
};

export type ProductContent = { originProductNo: number; channelProducts: ChannelProduct[] };

export type ProductSearchResponse = {
  contents: ProductContent[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
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
  const response = await fetch(`${NAVER_COMMERCE_BASE_URL}/v1/products/search`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ page: 1, size: 100 }),
    cache: "no-store",
  });
  const payload = (await response.json()) as unknown;
  if (!response.ok) {
    const error = payload as NaverApiError;
    throw new NaverCommerceError(error.message ?? error.code ?? "네이버 상품 목록 조회에 실패했습니다.", response.status);
  }
  return payload as ProductSearchResponse;
}

export async function getProductDetail(productId: string) {
  const response = await getNaverProducts();
  return response.contents.flatMap((content) => content.channelProducts).find(
    (product) => String(product.channelProductNo) === productId || String(product.originProductNo) === productId,
  );
}
