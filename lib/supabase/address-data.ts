import "server-only";
import { getCurrentUser } from "./user";
import { createClient } from "./server";
import type { Address } from "./addresses";

export async function getAddresses(): Promise<{ addresses: Address[]; error: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { addresses: [], error: true };
  const supabase = await createClient();
  try {
    const { data, error } = await supabase.from("addresses").select("id,label,recipient_name,recipient_phone,postal_code,address_line1,address_line2,delivery_note,is_default").eq("user_id", user.id).order("is_default", { ascending: false }).order("created_at", { ascending: false }).order("id");
    return { addresses: data ?? [], error: Boolean(error) };
  } catch { return { addresses: [], error: true }; }
}
