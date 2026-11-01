export type QuestionnaireFieldType =
  | "text"
  | "textarea"
  | "number"
  | "select"
  | "multiselect"
  | "scale";

export type QuestionnaireField = {
  id: string;
  label: string;
  type: QuestionnaireFieldType;
  required?: boolean;
  options?: string[];
  min?: number;
  max?: number;
  placeholder?: string;
};

export type QuestionnaireTemplateData = {
  id: string;
  title: string;
  description: string;
  fields: QuestionnaireField[];
  isDefault: boolean;
  updatedAt?: string;
};

export const FIELD_TYPE_OPTIONS: Array<{
  value: QuestionnaireFieldType;
  label: string;
}> = [
  { value: "text", label: "Short text" },
  { value: "textarea", label: "Long text" },
  { value: "number", label: "Number" },
  { value: "select", label: "Single choice" },
  { value: "multiselect", label: "Multi choice" },
  { value: "scale", label: "Scale" },
];

/** Seeded default onboarding form assigned with new invites. */
export const DEFAULT_ONBOARDING_FIELDS: QuestionnaireField[] = [
  {
    id: "goals",
    label: "Primary goals",
    type: "textarea",
    required: true,
    placeholder: "Strength, fat loss, performance, habits…",
  },
  {
    id: "experience",
    label: "Training experience",
    type: "select",
    required: true,
    options: ["Beginner (<1 yr)", "Intermediate (1–3 yrs)", "Advanced (3+ yrs)"],
  },
  {
    id: "injuries",
    label: "Injuries or limitations",
    type: "textarea",
    placeholder: "Past injuries, pain, medical notes your coach should know",
  },
  {
    id: "availability",
    label: "Weekly training availability",
    type: "select",
    required: true,
    options: ["2 days", "3 days", "4 days", "5+ days"],
  },
  {
    id: "equipment",
    label: "Equipment access",
    type: "select",
    required: true,
    options: ["Full gym", "Home gym", "Minimal / bodyweight", "Mixed"],
  },
  {
    id: "commitment",
    label: "How ready do you feel to start? (1–10)",
    type: "scale",
    required: true,
    min: 1,
    max: 10,
  },
  {
    id: "notes",
    label: "Anything else for your coach?",
    type: "textarea",
    placeholder: "Schedule quirks, preferences, questions…",
  },
];

export function createFieldId() {
  return `qf-${Math.random().toString(36).slice(2, 9)}`;
}

export function emptyQuestionnaireField(
  type: QuestionnaireFieldType = "text",
): QuestionnaireField {
  const base: QuestionnaireField = {
    id: createFieldId(),
    label: "",
    type,
    required: false,
  };
  if (type === "select" || type === "multiselect") {
    return { ...base, options: ["Option 1", "Option 2"] };
  }
  if (type === "scale") {
    return { ...base, min: 1, max: 10 };
  }
  if (type === "textarea") {
    return { ...base, placeholder: "" };
  }
  return base;
}

export function emptyAnswers(fields: QuestionnaireField[]): Record<string, string> {
  return Object.fromEntries(
    fields.map((field) => [
      field.id,
      field.type === "multiselect" ? "[]" : "",
    ]),
  );
}

export function parseMultiAnswers(raw: string | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map(String).filter(Boolean);
    }
  } catch {
    // fall through — legacy pipe-separated
  }
  return raw
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function encodeMultiAnswers(values: string[]): string {
  return JSON.stringify(values);
}

export function formatAnswerForDisplay(
  field: QuestionnaireField,
  raw: string | undefined,
): string {
  if (!raw) return "—";
  if (field.type === "multiselect") {
    const values = parseMultiAnswers(raw);
    return values.length > 0 ? values.join(", ") : "—";
  }
  return raw;
}

export function normalizeFields(fields: QuestionnaireField[]): QuestionnaireField[] {
  return fields
    .map((field, index) => {
      const type = FIELD_TYPE_OPTIONS.some((opt) => opt.value === field.type)
        ? field.type
        : "text";
      const id =
        field.id?.trim() ||
        `qf-${index}-${Math.random().toString(36).slice(2, 6)}`;
      const label = field.label?.trim() || `Question ${index + 1}`;
      const next: QuestionnaireField = {
        id,
        label,
        type,
        required: Boolean(field.required),
      };
      if (field.placeholder?.trim()) next.placeholder = field.placeholder.trim();
      if (type === "select" || type === "multiselect") {
        next.options = (field.options ?? [])
          .map((option) => option.trim())
          .filter(Boolean);
        if (next.options.length === 0) next.options = ["Option 1"];
      }
      if (type === "scale" || type === "number") {
        if (typeof field.min === "number") next.min = field.min;
        if (typeof field.max === "number") next.max = field.max;
        if (type === "scale") {
          next.min = next.min ?? 1;
          next.max = next.max ?? 10;
        }
      }
      return next;
    })
    .filter((field) => field.label.length > 0);
}

export function resolveAssignmentFields(
  snapshot: string | null | undefined,
  templateFields: string,
): QuestionnaireField[] {
  if (snapshot) {
    try {
      const parsed = JSON.parse(snapshot) as QuestionnaireField[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // fall through
    }
  }
  try {
    const parsed = JSON.parse(templateFields) as QuestionnaireField[];
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // ignore
  }
  return [];
}
