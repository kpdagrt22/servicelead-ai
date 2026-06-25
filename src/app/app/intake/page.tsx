import { requireOrg } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { QuestionsEditor } from "@/components/app/questions-editor";
import { env } from "@/lib/env";
import type {
  IntakeQuestion,
  IntakeTemplate,
  ServiceCategory,
} from "@/types/database";
import {
  addServiceCategoryAction,
  deleteServiceCategoryAction,
  toggleServiceCategoryAction,
} from "./actions";

export const metadata = { title: "Service & intake — ServiceLead AI" };

export default async function IntakePage() {
  const ctx = await requireOrg();
  const supabase = await createClient();

  const [{ data: categories }, { data: templates }] = await Promise.all([
    supabase
      .from("service_categories")
      .select("*")
      .eq("organization_id", ctx.organization.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("intake_templates")
      .select("*")
      .eq("organization_id", ctx.organization.id),
  ]);

  const cats = (categories ?? []) as ServiceCategory[];
  const tmpls = (templates ?? []) as IntakeTemplate[];
  const templateFor = (categoryId: string) =>
    tmpls.find((t) => t.service_category_id === categoryId);

  const publicUrl = `${env.app.url}/u/${ctx.organization.slug}`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Service categories & intake</h1>
        <p className="text-sm text-gray-500">
          Configure what you offer and the questions the AI asks each customer.
        </p>
      </div>

      {/* Public link */}
      <div className="card flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <p className="text-sm font-semibold">Your public intake form</p>
          <p className="text-xs text-gray-500">
            Share this link or use it to test without telephony.
          </p>
        </div>
        <code className="rounded bg-gray-100 px-3 py-1.5 text-xs">{publicUrl}</code>
      </div>

      {/* Add category */}
      <div className="card p-5">
        <h2 className="font-semibold">Add a service category</h2>
        <form action={addServiceCategoryAction} className="mt-3 flex flex-wrap gap-2">
          <input name="name" className="input flex-1" placeholder="e.g. Drain cleaning" required />
          <input
            name="description"
            className="input flex-1"
            placeholder="Short description (optional)"
          />
          <button type="submit" className="btn-primary">
            Add
          </button>
        </form>
      </div>

      {/* Categories + questions */}
      <div className="space-y-4">
        {cats.map((cat) => {
          const tmpl = templateFor(cat.id);
          return (
            <div key={cat.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{cat.name}</h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        cat.active
                          ? "bg-brand-100 text-brand-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {cat.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  {cat.description && (
                    <p className="mt-1 text-sm text-gray-500">{cat.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <form action={toggleServiceCategoryAction}>
                    <input type="hidden" name="id" value={cat.id} />
                    <input type="hidden" name="active" value={String(cat.active)} />
                    <button type="submit" className="btn-ghost text-xs">
                      {cat.active ? "Deactivate" : "Activate"}
                    </button>
                  </form>
                  <form action={deleteServiceCategoryAction}>
                    <input type="hidden" name="id" value={cat.id} />
                    <button
                      type="submit"
                      className="btn-ghost text-xs text-red-500 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </div>

              {tmpl ? (
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                    Intake questions
                  </p>
                  <QuestionsEditor
                    templateId={tmpl.id}
                    initial={(tmpl.questions as IntakeQuestion[]) ?? []}
                  />
                </div>
              ) : (
                <p className="mt-3 text-xs text-gray-400">
                  No intake template yet for this category.
                </p>
              )}
            </div>
          );
        })}
        {cats.length === 0 && (
          <p className="text-sm text-gray-500">
            No service categories yet — add one above.
          </p>
        )}
      </div>
    </div>
  );
}
