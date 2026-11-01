import type { Metadata } from "next";

import { ExerciseLibrary } from "@/components/exercises/exercise-library";

export const metadata: Metadata = { title: "Exercises" };

export default function ExercisesPage() {
  return <ExerciseLibrary />;
}
