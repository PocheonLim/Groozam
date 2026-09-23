"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/supabase/user";
import { createClient } from "@/lib/supabase/server";
import { validateProfile, type ProfileResult } from "@/lib/supabase/profile";

export async function updateProfile(formData: FormData): Promise<ProfileResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, message: "로그인이 만료되었습니다. 다시 로그인한 후 저장해 주세요." };
  const validated = validateProfile(formData.get("display_name"), formData.get("phone"));
  if (!validated.values) return { success: false, message: validated.error };
  const supabase = await createClient();
  try {
    // Neither the owner UUID nor writable columns come from arbitrary form keys.
    const { data, error } = await supabase.from("profiles")
      .update(validated.values).eq("id", user.id).select("id").maybeSingle();
    if (error) return { success: false, message: "회원정보를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." };
    if (!data) return { success: false, message: "회원정보를 찾을 수 없습니다. 고객센터에 문의해 주세요." };
  } catch {
    return { success: false, message: "연결이 원활하지 않습니다. 잠시 후 다시 저장해 주세요." };
  }
  revalidatePath("/mypage");
  revalidatePath("/auth/confirmed");
  return { success: true, message: "회원정보가 저장되었습니다." };
}
