export type MuscleGroup =
  | "Chest"
  | "Back"
  | "Shoulders"
  | "Legs"
  | "Glutes"
  | "Core"
  | "Arms"
  | "Full body";

export type Exercise = {
  id: string;
  name: string;
  muscleGroups: MuscleGroup[];
  equipment: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  cues: string[];
  commonMistakes: string[];
  demoLabel: string;
  demoKind: "video" | "image";
};

const FAVORITES_KEY = "echelon.exercises.favorites.v1";

export const MUSCLE_FILTERS: Array<MuscleGroup | "All"> = [
  "All",
  "Chest",
  "Back",
  "Shoulders",
  "Legs",
  "Glutes",
  "Core",
  "Arms",
  "Full body",
];

export const EXERCISE_LIBRARY: Exercise[] = [
  {
    id: "ex-back-squat",
    name: "Back squat",
    muscleGroups: ["Legs", "Glutes", "Core"],
    equipment: "Barbell",
    difficulty: "Intermediate",
    cues: [
      "Brace before you unrack — ribs down, belt tight.",
      "Break at hips and knees together; keep mid-foot pressure.",
      "Drive up without dumping forward onto the toes.",
    ],
    commonMistakes: ["Knees caving", "Losing upper-back tightness", "Cutting depth early"],
    demoLabel: "Back squat demo",
    demoKind: "video",
  },
  {
    id: "ex-rdl",
    name: "Romanian deadlift",
    muscleGroups: ["Legs", "Glutes", "Back"],
    equipment: "Barbell",
    difficulty: "Intermediate",
    cues: [
      "Soft knees, hinge from the hips, bar close to thighs.",
      "Feel stretch in hamstrings before standing tall.",
      "Finish with glutes — don’t hyperextend the low back.",
    ],
    commonMistakes: ["Rounding lumbar", "Bar drifting away", "Locking knees hard"],
    demoLabel: "RDL demo",
    demoKind: "video",
  },
  {
    id: "ex-bench",
    name: "Bench press",
    muscleGroups: ["Chest", "Shoulders", "Arms"],
    equipment: "Barbell",
    difficulty: "Intermediate",
    cues: [
      "Plant feet, set scapulae, slight arch.",
      "Lower to mid-chest with forearms vertical.",
      "Press through without flaring elbows excessively.",
    ],
    commonMistakes: ["Bouncing off chest", "Uneven bar path", "Wrists breaking back"],
    demoLabel: "Bench press demo",
    demoKind: "video",
  },
  {
    id: "ex-row",
    name: "Chest-supported row",
    muscleGroups: ["Back", "Arms"],
    equipment: "Dumbbells",
    difficulty: "Beginner",
    cues: [
      "Chest glued to pad; pull elbows toward hips.",
      "Pause briefly with shoulder blades packed.",
      "Control the eccentric — no bouncing at the bottom.",
    ],
    commonMistakes: ["Shrugging traps", "Using momentum", "Short range of motion"],
    demoLabel: "Row demo still",
    demoKind: "image",
  },
  {
    id: "ex-ohp",
    name: "Overhead press",
    muscleGroups: ["Shoulders", "Core", "Arms"],
    equipment: "Barbell",
    difficulty: "Intermediate",
    cues: [
      "Ribs stacked over pelvis; squeeze glutes.",
      "Press up and slightly back to finish over mid-foot.",
      "Lock out without leaning excessively.",
    ],
    commonMistakes: ["Excessive layback", "Flaring ribs", "Pressing forward"],
    demoLabel: "OHP demo",
    demoKind: "video",
  },
  {
    id: "ex-lunge",
    name: "Walking lunge",
    muscleGroups: ["Legs", "Glutes"],
    equipment: "Dumbbells",
    difficulty: "Beginner",
    cues: [
      "Long enough stride that both knees bend ~90°.",
      "Front knee tracks over mid-foot.",
      "Stand tall between steps — no collapsing torso.",
    ],
    commonMistakes: ["Short choppy steps", "Front heel lifting", "Torso tipping"],
    demoLabel: "Lunge demo",
    demoKind: "image",
  },
  {
    id: "ex-pullup",
    name: "Pull-up",
    muscleGroups: ["Back", "Arms"],
    equipment: "Bodyweight",
    difficulty: "Advanced",
    cues: [
      "Start from a dead hang with shoulders packed.",
      "Lead with elbows; chin clears the bar.",
      "Lower under control to full extension.",
    ],
    commonMistakes: ["Kipping when not programmed", "Half reps", "Neck craning"],
    demoLabel: "Pull-up demo",
    demoKind: "video",
  },
  {
    id: "ex-plank",
    name: "Front plank",
    muscleGroups: ["Core", "Full body"],
    equipment: "Bodyweight",
    difficulty: "Beginner",
    cues: [
      "Elbows under shoulders; push the floor away.",
      "Squeeze glutes and quads; long neck.",
      "Breathe steadily — don’t hold your breath.",
    ],
    commonMistakes: ["Hips sagging", "Hips too high", "Shrugged shoulders"],
    demoLabel: "Plank position",
    demoKind: "image",
  },
  {
    id: "ex-hip-thrust",
    name: "Barbell hip thrust",
    muscleGroups: ["Glutes", "Legs"],
    equipment: "Barbell",
    difficulty: "Intermediate",
    cues: [
      "Upper back on bench, chin tucked lightly.",
      "Drive through heels to full hip extension.",
      "Pause at the top without overarching lumbar.",
    ],
    commonMistakes: ["Pushing through toes", "Overextending low back", "Bar rolling"],
    demoLabel: "Hip thrust demo",
    demoKind: "video",
  },
  {
    id: "ex-face-pull",
    name: "Cable face pull",
    muscleGroups: ["Shoulders", "Back"],
    equipment: "Cable",
    difficulty: "Beginner",
    cues: [
      "Pull toward face with external rotation.",
      "Lead with elbows high; finish with hands by ears.",
      "Control the return — don’t let the stack slam.",
    ],
    commonMistakes: ["Turning it into a row", "Too much weight", "Shrugging"],
    demoLabel: "Face pull demo",
    demoKind: "image",
  },
];

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadFavoriteIds(): string[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    throw new Error("Could not load exercise favorites");
  }
}

export function saveFavoriteIds(ids: string[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
}

export function getExerciseById(id: string) {
  return EXERCISE_LIBRARY.find((exercise) => exercise.id === id) ?? null;
}

export function filterExercises(
  query: string,
  muscle: MuscleGroup | "All",
  favoritesOnly: boolean,
  favoriteIds: string[],
) {
  const q = query.trim().toLowerCase();
  return EXERCISE_LIBRARY.filter((exercise) => {
    if (favoritesOnly && !favoriteIds.includes(exercise.id)) return false;
    if (muscle !== "All" && !exercise.muscleGroups.includes(muscle)) return false;
    if (!q) return true;
    return (
      exercise.name.toLowerCase().includes(q) ||
      exercise.equipment.toLowerCase().includes(q) ||
      exercise.muscleGroups.some((group) => group.toLowerCase().includes(q))
    );
  });
}
