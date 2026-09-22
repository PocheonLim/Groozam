import type { ProductDeliveryInfo } from "@/app/lib/naver-commerce";

const money = new Intl.NumberFormat("ko-KR");
const formatFee = (fee: number) => `${money.format(fee)}원`;

export default function ProductDelivery({
  info,
}: {
  info?: ProductDeliveryInfo;
}) {
  const fee = info?.deliveryFee;
  const base = fee?.baseFee;
  const hasBase =
    typeof base === "number" && Number.isFinite(base) && base >= 0;
  let label = "배송비는 상품 상세 안내를 확인해 주세요.";
  if (fee?.deliveryFeeType === "FREE") label = "무료배송";
  else if (hasBase) {
    label = formatFee(base);
    if (fee?.deliveryFeeType === "UNIT_QUANTITY_PAID") {
      label =
        fee.repeatQuantity && fee.repeatQuantity > 0
          ? `${fee.repeatQuantity}개당 ${formatFee(base)}`
          : `${formatFee(base)} (수량별 부과)`;
    } else if (fee?.deliveryFeeType === "CONDITIONAL_FREE") {
      label += fee.freeConditionalAmount
        ? ` · ${formatFee(fee.freeConditionalAmount)} 이상 무료`
        : " (조건부 무료)";
    } else if (fee?.deliveryFeeType === "RANGE_QUANTITY_PAID") {
      label = `기본 ${formatFee(base)} · 수량 구간별 추가 부과`;
    }
  }
  const payment =
    fee?.deliveryFeeType === "FREE"
      ? undefined
      : (
          {
            COLLECT: "착불",
            PREPAID: "선결제",
            COLLECT_OR_PREPAID: "착불 또는 선결제",
          } as Record<string, string>
        )[fee?.deliveryFeePayType ?? ""];
  const area = fee?.deliveryFeeByArea;

  return (
    <dl className="mt-5 space-y-3 text-sm" aria-label="배송 안내">
      <div className="grid grid-cols-[64px_1fr] gap-4">
        <dt className="text-stone-500">배송비</dt>
        <dd className="leading-6">
          {label}
          {payment && <span className="ml-2 text-stone-600">({payment})</span>}
        </dd>
      </div>
      {info?.deliveryType && (
        <div className="grid grid-cols-[64px_1fr] gap-4">
          <dt className="text-stone-500">배송방법</dt>
          <dd>
            {info.deliveryType === "DIRECT"
              ? "직접배송"
              : info.deliveryType === "DELIVERY"
                ? "택배배송"
                : "상품 상세 안내 참고"}
          </dd>
        </div>
      )}
      {(fee?.differentialFeeByArea ||
        (area?.area2extraFee ?? 0) > 0 ||
        (area?.area3extraFee ?? 0) > 0) && (
        <div className="grid grid-cols-[64px_1fr] gap-4">
          <dt className="text-stone-500">지역배송</dt>
          <dd className="space-y-1 leading-6 text-stone-600">
            {fee?.differentialFeeByArea && (
              <p className="whitespace-pre-line">{fee.differentialFeeByArea}</p>
            )}
            {(area?.area2extraFee ?? 0) > 0 && (
              <p>
                {area?.deliveryAreaType === "AREA_3" ? "제주" : "제주·도서산간"}{" "}
                추가 {formatFee(area!.area2extraFee!)}
              </p>
            )}
            {area?.deliveryAreaType === "AREA_3" &&
              (area.area3extraFee ?? 0) > 0 && (
                <p>제주 외 도서산간 추가 {formatFee(area.area3extraFee!)}</p>
              )}
          </dd>
        </div>
      )}
      {info?.installationFee && (
        <div className="grid grid-cols-[64px_1fr] gap-4">
          <dt className="text-stone-500">설치비</dt>
          <dd>별도 부과 · 상품 상세 안내 참고</dd>
        </div>
      )}
    </dl>
  );
}
