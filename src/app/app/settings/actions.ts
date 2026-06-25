"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireOrgOwnerOrAdmin } from "@/lib/auth";
import { normalizePhoneOrRaw } from "@/lib/phone";

const settingsSchema = z.object({
  name: z.string().min(2),
  phone: z.string().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  notificationEmail: z.string().email().optional().or(z.literal("")),
  notificationPhone: z.string().optional().or(z.literal("")),
  bookingLink: z.string().url().optional().or(z.literal("")),
  reviewLink: z.string().url().optional().or(z.literal("")),
  emergencyService: z.boolean(),
});

export async function updateSettingsAction(formData: FormData) {
  const ctx = await requireOrgOwnerOrAdmin();
  const parsed = settingsSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") ?? "",
    website: formData.get("website") ?? "",
    notificationEmail: formData.get("notificationEmail") ?? "",
    notificationPhone: formData.get("notificationPhone") ?? "",
    bookingLink: formData.get("bookingLink") ?? "",
    reviewLink: formData.get("reviewLink") ?? "",
    emergencyService: formData.get("emergencyService") === "on",
  });
  if (!parsed.success) redirect("/app/settings?error=invalid");

  const d = parsed.data;
  const supabase = await createClient();
  await supabase
    .from("organizations")
    .update({
      name: d.name,
      phone: normalizePhoneOrRaw(d.phone) || null,
      website: d.website || null,
      notification_email: d.notificationEmail || null,
      notification_phone: normalizePhoneOrRaw(d.notificationPhone) || null,
      booking_link: d.bookingLink || null,
      review_link: d.reviewLink || null,
      emergency_service: d.emergencyService,
    })
    .eq("id", ctx.organization.id);

  revalidatePath("/app/settings");
  revalidatePath("/app");
  redirect("/app/settings?saved=1");
}

const twilioNumberSchema = z.object({
  phoneNumber: z.string().min(7),
});

/** Register a Twilio number to route inbound SMS/voice to this org. */
export async function addTwilioNumberAction(formData: FormData) {
  const ctx = await requireOrgOwnerOrAdmin();
  const parsed = twilioNumberSchema.safeParse({
    phoneNumber: formData.get("phoneNumber"),
  });
  if (!parsed.success) redirect("/app/settings?numberError=invalid");

  const phone = normalizePhoneOrRaw(parsed.data.phoneNumber);
  if (!phone) redirect("/app/settings?numberError=invalid");

  const supabase = await createClient();

  // A phone number routes to exactly one org (unique constraint, 0006). Reject
  // a number already claimed by ANY org rather than silently inserting a
  // duplicate that would break inbound routing.
  const { data: existing } = await supabase
    .from("twilio_numbers")
    .select("organization_id")
    .eq("phone_number", phone)
    .maybeSingle();
  if (existing) {
    redirect(
      existing.organization_id === ctx.organization.id
        ? "/app/settings?numberError=already_yours"
        : "/app/settings?numberError=taken",
    );
  }

  const { error } = await supabase.from("twilio_numbers").insert({
    organization_id: ctx.organization.id,
    phone_number: phone,
    status: "active",
  });
  if (error) {
    // Unique-violation backstop against a race.
    if ((error as { code?: string }).code === "23505") {
      redirect("/app/settings?numberError=taken");
    }
    redirect("/app/settings?numberError=failed");
  }

  revalidatePath("/app/settings");
  redirect("/app/settings?numberAdded=1");
}
