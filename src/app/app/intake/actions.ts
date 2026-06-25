"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireOrg } from "@/lib/auth";
import {
  intakeQuestionSchema,
  serviceCategorySchema,
} from "@/lib/validation/schemas";
import { DEFAULT_INTAKE_QUESTIONS } from "@/lib/constants";

export async function addServiceCategoryAction(formData: FormData) {
  const ctx = await requireOrg();
  const parsed = serviceCategorySchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    active: true,
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  const { data: cat } = await supabase
    .from("service_categories")
    .insert({
      organization_id: ctx.organization.id,
      name: parsed.data.name,
      description: parsed.data.description || null,
      active: true,
    })
    .select("id")
    .single();

  // Seed a default intake template for the new category.
  if (cat) {
    await supabase.from("intake_templates").insert({
      organization_id: ctx.organization.id,
      service_category_id: cat.id,
      name: `${parsed.data.name} intake`,
      questions: DEFAULT_INTAKE_QUESTIONS,
    });
  }
  revalidatePath("/app/intake");
}

export async function toggleServiceCategoryAction(formData: FormData) {
  const ctx = await requireOrg();
  const id = String(formData.get("id"));
  const active = formData.get("active") === "true";
  const supabase = await createClient();
  await supabase
    .from("service_categories")
    .update({ active: !active })
    .eq("id", id)
    .eq("organization_id", ctx.organization.id);
  revalidatePath("/app/intake");
}

export async function deleteServiceCategoryAction(formData: FormData) {
  const ctx = await requireOrg();
  const id = String(formData.get("id"));
  const supabase = await createClient();
  await supabase
    .from("service_categories")
    .delete()
    .eq("id", id)
    .eq("organization_id", ctx.organization.id);
  revalidatePath("/app/intake");
}

const saveQuestionsSchema = z.object({
  templateId: z.string().uuid(),
  questions: z.array(intakeQuestionSchema),
});

export async function saveIntakeQuestionsAction(input: {
  templateId: string;
  questions: { key: string; label: string; required: boolean }[];
}) {
  const ctx = await requireOrg();
  const parsed = saveQuestionsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid questions" };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("intake_templates")
    .update({ questions: parsed.data.questions })
    .eq("id", parsed.data.templateId)
    .eq("organization_id", ctx.organization.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/app/intake");
  return { ok: true };
}
