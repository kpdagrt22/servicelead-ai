"use client";

import { useState, useTransition } from "react";
import { saveIntakeQuestionsAction } from "@/app/app/intake/actions";
import { slugify } from "@/lib/utils";
import type { IntakeQuestion } from "@/types/database";

export function QuestionsEditor({
  templateId,
  initial,
}: {
  templateId: string;
  initial: IntakeQuestion[];
}) {
  const [questions, setQuestions] = useState<IntakeQuestion[]>(
    initial.length ? initial : [],
  );
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function update(i: number, patch: Partial<IntakeQuestion>) {
    setQuestions((qs) => qs.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
    setSaved(false);
  }
  function remove(i: number) {
    setQuestions((qs) => qs.filter((_, idx) => idx !== i));
    setSaved(false);
  }
  function add() {
    setQuestions((qs) => [
      ...qs,
      { key: `q_${qs.length + 1}`, label: "", required: false },
    ]);
    setSaved(false);
  }

  function save() {
    const cleaned = questions
      .filter((q) => q.label.trim())
      .map((q) => ({
        key: q.key || slugify(q.label) || "question",
        label: q.label.trim(),
        required: q.required,
      }));
    startTransition(async () => {
      const res = await saveIntakeQuestionsAction({
        templateId,
        questions: cleaned,
      });
      setSaved(Boolean(res?.ok));
    });
  }

  return (
    <div className="space-y-2">
      {questions.map((q, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            className="input flex-1"
            value={q.label}
            placeholder="Question to ask the customer"
            onChange={(e) => update(i, { label: e.target.value })}
          />
          <label className="flex items-center gap-1 text-xs text-gray-500">
            <input
              type="checkbox"
              checked={q.required}
              onChange={(e) => update(i, { required: e.target.checked })}
            />
            Required
          </label>
          <button
            type="button"
            onClick={() => remove(i)}
            className="text-gray-400 hover:text-red-500"
            aria-label="Remove question"
          >
            ✕
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2 pt-1">
        <button type="button" onClick={add} className="btn-ghost text-xs">
          + Add question
        </button>
        <button
          type="button"
          onClick={save}
          className="btn-secondary text-xs"
          disabled={pending}
        >
          {pending ? "Saving…" : "Save questions"}
        </button>
        {saved && <span className="text-xs text-brand-600">✓ Saved</span>}
      </div>
    </div>
  );
}
