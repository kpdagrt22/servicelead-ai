"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireOrg } from "@/lib/auth";

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
  const ctx = await requireOrg();
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
  if (!parsed.success) return;

  const d = parsed.data;
  const supabase = await createClient();
  await supabase
    .from("organizations")
    .update({
      name: d.name,
      phone: d.phone || null,
      website: d.website || null,
      notification_email: d.notificationEmail || null,
      notification_phone: d.notificationPhone || null,
      booking_link: d.bookingLink || null,
      review_link: d.reviewLink || null,
      emergency_service: d.emergencyService,
    })
    .eq("id", ctx.organization.id);

  revalidatePath("/app/settings");
  revalidatePath("/app");
}

const twilioNumberSchema = z.object({
  phoneNumber: z.string().min(7),
});

/** Register a Twilio number to route inbound SMS/voice to this org. */
export async function addTwilioNumberAction(formData: FormData) {
  const ctx = await requireOrg();
  const parsed = twilioNumberSchema.safeParse({
    phoneNumber: formData.get("phoneNumber"),
  });
  if (!parsed.success) return;
  const supabase = await createClient();
  await supabase.from("twilio_numbers").insert({
    organization_id: ctx.organization.id,
    phone_number: parsed.data.phoneNumber,
    status: "active",
  });
  revalidatePath("/app/settings");
}
