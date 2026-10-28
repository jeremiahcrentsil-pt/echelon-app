export type CheckInFieldType = "number" | "scale" | "select" | "text" | "textarea";

export type CheckInField = {
  id: string;
  label: string;
  type: CheckInFieldType;
  required?: boolean;
  unit?: string;
  min?: number;
  max?: number;
  options?: string[];
  placeholder?: string;
};

export type CheckInFormTemplate = {
  id: string;
  title: string;
  description: string;
  cadence: string;
  fields: CheckInField[];
};

export type CheckInSubmission = {
  id: string;
  formId: string;
  formTitle: string;
  submittedAt: string;
  answers: Record<string, string>;
};

const STORAGE_KEY = "echelon.checkins.v1";

export const ASSIGNED_FORMS: CheckInFormTemplate[] = [
  {
    id: "weekly-check-in",
    title: "Weekly check-in",
    description:
      "Share how training and recovery landed this week so coaching can adjust.",
    cadence: "Weekly",
    fields: [
      {
        id: "weight",
        label: "Morning weight",
        type: "number",
        unit: "lb",
        required: true,
        placeholder: "e.g. 178",
      },
      {
        id: "energy",
        label: "Energy (1–10)",
        type: "scale",
        min: 1,
        max: 10,
        required: true,
      },
      {
        id: "sleep",
        label: "Average sleep",
        type: "number",
        unit: "hrs",
        min: 0,
        max: 14,
        required: true,
        placeholder: "e.g. 7.5",
      },
      {
        id: "training_adherence",
        label: "Training adherence",
        type: "select",
        required: true,
        options: ["All sessions", "Most sessions", "About half", "Missed most"],
      },
      {
        id: "nutrition_adherence",
        label: "Nutrition adherence",
        type: "select",
        required: true,
        options: ["On target", "Mostly on", "Hit or miss", "Off plan"],
      },
      {
        id: "notes",
        label: "Notes for coach",
        type: "textarea",
        placeholder: "Stress, travel, niggles, wins…",
      },
    ],
  },
  {
    id: "biweekly-body",
    title: "Body & lifestyle pulse",
    description: "A lighter mid-cycle form for weight trend and lifestyle load.",
    cadence: "Every 2 weeks",
    fields: [
      {
        id: "weight",
        label: "Weight",
        type: "number",
        unit: "lb",
        required: true,
      },
      {
        id: "stress",
        label: "Stress load (1–10)",
        type: "scale",
        min: 1,
        max: 10,
        required: true,
      },
      {
        id: "hunger",
        label: "Hunger management",
        type: "select",
        required: true,
        options: ["Easy", "Manageable", "Tough evenings", "Constant"],
      },
      {
        id: "notes",
        label: "Anything else?",
        type: "textarea",
      },
    ],
  },
];

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function emptyAnswers(form: CheckInFormTemplate): Record<string, string> {
  return Object.fromEntries(form.fields.map((field) => [field.id, ""]));
}

export function loadSubmissions(): CheckInSubmission[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CheckInSubmission[];
    if (!Array.isArray(parsed)) throw new Error("Invalid check-in store");
    return parsed;
  } catch {
    throw new Error("Could not load check-ins from local storage");
  }
}

export function saveSubmissions(submissions: CheckInSubmission[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(submissions));
}

export function formatSubmittedAt(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function getFormById(id: string) {
  return ASSIGNED_FORMS.find((form) => form.id === id);
}

export function summarizeAnswers(
  form: CheckInFormTemplate,
  answers: Record<string, string>,
) {
  return form.fields
    .filter((field) => answers[field.id]?.trim())
    .slice(0, 3)
    .map((field) => {
      const value = answers[field.id];
      return field.unit ? `${field.label}: ${value} ${field.unit}` : `${field.label}: ${value}`;
    })
    .join(" · ");
}
