import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { validateProfile } from "./profile";

// The existing Auth trigger creates an empty profile. Fill only an unset name
// after verification; user metadata is display data, never authorization data.
export async function saveSignupName(supabase: SupabaseClient): Promise<void> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user?.email_confirmed_at) return;
    const checked = validateProfile(user.user_metadata?.display_name, "");
    if (!checked.values?.display_name) return;
    const { error: updateError } = await supabase.from("profiles")
      .update({ display_name: checked.values.display_name }).eq("id", user.id).is("display_name", null);
    if (updateError) console.warn("[auth/signup] Profile name save failed", { code: updateError.code });
  } catch {
    console.warn("[auth/signup] Profile name save unavailable");
  }
}
