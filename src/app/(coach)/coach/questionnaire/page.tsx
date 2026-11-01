import type { Metadata } from "next";

import { CoachQuestionnaireEditor } from "@/components/coach/coach-questionnaire-editor";

export const metadata: Metadata = { title: "Questionnaire" };

export default function CoachQuestionnairePage() {
  return <CoachQuestionnaireEditor />;
}
