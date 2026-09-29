"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/supabase/user";
import { createClient } from "@/lib/supabase/server";
import { validateAddress, type AddressOperation, type AddressResult } from "@/lib/supabase/addresses";

export async function writeAddress(operation: AddressOperation, id: string | null, form?: FormData): Promise<AddressResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, message: "로그인이 만료되었습니다. 다시 로그인해 주세요." };
  if (!["save", "delete", "default"].includes(operation) || (id !== null && (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))) || (operation !== "save" && !id)) return { success: false, message: "배송지 요청을 확인해 주세요." };
  const validated = operation === "save" && form instanceof FormData ? validateAddress(form) : null;
  if (operation === "save" && !validated?.values) return { success: false, message: validated?.error ?? "배송지 내용을 확인해 주세요." };
  const supabase = await createClient();
  try {
    // Ownership comes exclusively from the user's verified JWT (auth.uid in RPC).
    const { error } = await supabase.rpc("groozam_write_address", { p_operation: operation, p_id: id, p_values: validated?.values ?? {} });
    if (error) return { success: false, message: error.code === "P0002" ? "배송지를 찾을 수 없습니다. 목록을 새로고침해 주세요." : error.code === "23505" ? "기본 배송지가 변경되었습니다. 목록을 확인하고 다시 시도해 주세요." : "배송지를 처리하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  } catch { return { success: false, message: "연결이 원활하지 않습니다. 잠시 후 다시 시도해 주세요." }; }
  revalidatePath("/mypage");
  return { success: true, message: operation === "delete" ? "배송지가 삭제되었습니다." : operation === "default" ? "기본 배송지가 변경되었습니다." : "배송지가 저장되었습니다." };
}
