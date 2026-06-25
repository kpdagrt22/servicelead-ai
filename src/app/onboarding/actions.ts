"use server";

import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { onboardingSchema } from "@/lib/validation/schemas";
import { normalizePhoneOrRaw } from "@/lib/phone";
import { slugify } from "@/lib/utils";

export interface OnboardingState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function createOrganizationAction(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const parsed = onboardingSchema.safeParse({
    businessName: formData.get("businessName"),
    ownerName: formData.get("ownerName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    website: formData.get("website") ?? "",
    country: formData.get("country"),
    state: formData.get("state") ?? "",
    city: formData.get("city") ?? "",
    timezone: formData.get("timezone"),
    businessType: formData.get("businessType") ?? "",
    serviceCategories: formData.getAll("serviceCategories").map(String),
    emergencyService: formData.get("emergencyService") === "on",
    defaultResponseDelay: formData.get("defaultResponseDelay") ?? "",
    notificationEmail: formData.get("notificationEmail"),
    notificationPhone: formData.get("notificationPhone") ?? "",
    bookingLink: formData.get("bookingLink") ?? "",
    reviewLink: formData.get("reviewLink") ?? "",
    smsConsent: formData.get("smsConsent") === "on",
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join(".")] = issue.message;
    }
    return { error: "Please fix the highlighted fields.", fieldErrors };
  }

  const input = parsed.data;

  // Keep the profile name in sync.
  await supabase
    .from("profiles")
    .update({ full_name: input.ownerName, email: input.email })
    .eq("id", user.id);

  // Unique slug. Retry on the rare collision instead of surfacing a raw DB
  // error to a brand-new user.
  const base = slugify(input.businessName) || "business";
  const orgFields = {
    owner_id: user.id,
    name: input.businessName,
    business_type: input.businessType || null,
    country: input.country,
    state: input.state || null,
    city: input.city || null,
    timezone: input.timezone,
    website: input.website || null,
    phone: normalizePhoneOrRaw(input.phone) ?? input.phone,
    notification_email: input.notificationEmail,
    notification_phone: normalizePhoneOrRaw(input.notificationPhone) || null,
    booking_link: input.bookingLink || null,
    review_link: input.reviewLink || null,
    emergency_service: input.emergencyService,
    default_response_delay: input.defaultResponseDelay || null,
    sms_consent: input.smsConsent,
    onboarded: true,
  };

  let org: { id: string } | null = null;
  let lastError: { message: string; code?: string } | null = null;
  for (let attempt = 0; attempt < 5 && !org; attempt++) {
    const slug = `${base}-${randomBytes(attempt < 3 ? 3 : 5).toString("hex")}`;
    const { data, error } = await supabase
      .from("organizations")
      .insert({ ...orgFields, slug })
      .select("id")
      .single();
    if (data) {
      org = data as { id: string };
      break;
    }
    lastError = error as { message: string; code?: string } | null;
    // Only retry on a unique-violation (slug collision); fail fast otherwise.
    if (lastError?.code !== "23505") break;
  }

  if (!org) {
    return { error: `Could not create organization: ${lastError?.message}` };
  }

  // The DB trigger seeds the default service categories. Reconcile with the
  // owner's selection: deactivate any default they didn't pick, and add any
  // custom ones they typed that aren't defaults.
  if (input.serviceCategories.length > 0) {
    const { data: seeded } = await supabase
      .from("service_categories")
      .select("id, name")
      .eq("organization_id", org.id);

    const seededNames = new Set((seeded ?? []).map((c) => c.name as string));
    const selected = new Set(input.serviceCategories);

    for (const cat of seeded ?? []) {
      await supabase
        .from("service_categories")
        .update({ active: selected.has(cat.name as string) })
        .eq("id", cat.id);
    }
    // Add custom selections not present in defaults.
    for (const name of input.serviceCategories) {
      if (!seededNames.has(name)) {
        await supabase
          .from("service_categories")
          .insert({ organization_id: org.id, name, active: true });
      }
    }
  }

  redirect("/app");
}
