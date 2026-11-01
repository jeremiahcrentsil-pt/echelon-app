export type QuestionnaireFieldType =
  | "text"
  | "textarea"
  | "number"
  | "select"
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
};

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

export function emptyAnswers(fields: QuestionnaireField[]): Record<string, string> {
  return Object.fromEntries(fields.map((field) => [field.id, ""]));
}
