import type { Metadata } from "next";

import { WorkoutLogger } from "@/components/workouts/workout-logger";

export const metadata: Metadata = {
  title: "Workouts",
};

export default function WorkoutsPage() {
  return <WorkoutLogger />;
}
