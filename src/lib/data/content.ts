export type ContentType = "pdf" | "video" | "doc";

export type ContentCategory =
  | "Nutrition"
  | "Training"
  | "Recovery"
  | "Mindset"
  | "Onboarding";

export type ContentItem = {
  id: string;
  title: string;
  summary: string;
  type: ContentType;
  category: ContentCategory;
  tags: string[];
  postedAt: string;
  durationOrPages: string;
  body: string;
  /** Mock open target — external sample or in-app placeholder */
  openLabel: string;
  openHref?: string;
};

const SAVED_KEY = "echelon.content.saved.v1";
const POSTS_KEY = "echelon.content.posts.v1";

export const CONTENT_CATEGORIES: Array<ContentCategory | "All"> = [
  "All",
  "Onboarding",
  "Training",
  "Nutrition",
  "Recovery",
  "Mindset",
];

export const CONTENT_LIBRARY: ContentItem[] = [
  {
    id: "c-welcome-pdf",
    title: "Echelon client welcome packet",
    summary: "How coaching works here — check-ins, logging expectations, and response times.",
    type: "pdf",
    category: "Onboarding",
    tags: ["start here", "process"],
    postedAt: "2026-10-10",
    durationOrPages: "6 pages",
    body: "Skim this once, then keep it bookmarked. Covers weekly rhythm, photo standards, and when to message Jeremiah directly.",
    openLabel: "Open PDF preview",
    openHref: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
  },
  {
    id: "c-squat-video",
    title: "Squat setup checklist (video)",
    summary: "Two-minute walkthrough of brace, stance, and bar path cues used in your program.",
    type: "video",
    category: "Training",
    tags: ["squat", "technique"],
    postedAt: "2026-10-14",
    durationOrPages: "2:18",
    body: "Watch before Lower A. Pause on the brace frame if your last session felt tippy forward.",
    openLabel: "Play demo video",
    openHref: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
  },
  {
    id: "c-protein-guide",
    title: "Hitting protein without boredom",
    summary: "Practical swaps when chicken fatigue hits — still aligned with Plan A macros.",
    type: "doc",
    category: "Nutrition",
    tags: ["protein", "meals"],
    postedAt: "2026-10-18",
    durationOrPages: "4 min read",
    body: "Lists 12 high-protein defaults, convenience options for travel days, and how to log swaps in Nutrition.",
    openLabel: "Read guide",
  },
  {
    id: "c-sleep-pdf",
    title: "Sleep & recovery basics",
    summary: "PDF on wind-down habits that actually move readiness scores.",
    type: "pdf",
    category: "Recovery",
    tags: ["sleep", "readiness"],
    postedAt: "2026-10-20",
    durationOrPages: "5 pages",
    body: "Focus on consistent wake time and caffeine cutoffs. Optional: track sleep quality in Monitoring for two weeks.",
    openLabel: "Open PDF preview",
    openHref: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
  },
  {
    id: "c-deload-video",
    title: "What a deload should feel like",
    summary: "Short video clarifying effort, soreness, and when to push vs protect.",
    type: "video",
    category: "Training",
    tags: ["deload", "intensity"],
    postedAt: "2026-10-22",
    durationOrPages: "3:05",
    body: "Use this the week before a planned deload so expectations are clear — pumps are optional, crisp technique is not.",
    openLabel: "Play demo video",
    openHref: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
  },
  {
    id: "c-mindset",
    title: "Adherence > perfection",
    summary: "Coach note on handling missed sessions without spiraling the week.",
    type: "doc",
    category: "Mindset",
    tags: ["adherence", "check-in"],
    postedAt: "2026-10-24",
    durationOrPages: "3 min read",
    body: "Missed a lift? Log it honestly, pick the next session up, and mention it in the weekly check-in. We adjust from data, not guilt.",
    openLabel: "Read note",
  },
  {
    id: "c-photo-guide",
    title: "Progress photo standards",
    summary: "Lighting, angles, and weekly cadence for comparable shots.",
    type: "pdf",
    category: "Onboarding",
    tags: ["photos", "tracking"],
    postedAt: "2026-10-12",
    durationOrPages: "3 pages",
    body: "Same time of day, same distance from camera, relaxed posture. You’ll use this again when Progress photos ships fully.",
    openLabel: "Open PDF preview",
    openHref: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
  },
  {
    id: "c-grocery",
    title: "Grocery shortlist for Plan A",
    summary: "Repeatable cart that covers the cut-phase meal plan staples.",
    type: "doc",
    category: "Nutrition",
    tags: ["groceries", "meal plan"],
    postedAt: "2026-10-26",
    durationOrPages: "2 min read",
    body: "Protein anchors, carb staples, and freezer backups. Pair with Meal plans when shopping for the week.",
    openLabel: "Read list",
  },
];

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadSavedIds(): string[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(SAVED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    throw new Error("Could not load saved content");
  }
}

export function saveSavedIds(ids: string[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(SAVED_KEY, JSON.stringify(ids));
}

export function loadCoachPosts(): ContentItem[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(POSTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ContentItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    throw new Error("Could not load coach content posts");
  }
}

export function saveCoachPosts(posts: ContentItem[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
}

/** Seed catalog + coach-posted items (newest coach posts first). */
export function loadContentLibrary(): ContentItem[] {
  const posts = loadCoachPosts();
  const seedIds = new Set(CONTENT_LIBRARY.map((item) => item.id));
  const uniquePosts = posts.filter((item) => !seedIds.has(item.id));
  return [...uniquePosts, ...CONTENT_LIBRARY];
}

export function getContentById(id: string, library?: ContentItem[]) {
  const source = library ?? loadContentLibrary();
  return source.find((item) => item.id === id) ?? null;
}

export function filterContent(
  library: ContentItem[],
  query: string,
  category: ContentCategory | "All",
  type: ContentType | "All",
  savedOnly: boolean,
  savedIds: string[],
) {
  const q = query.trim().toLowerCase();
  return library.filter((item) => {
    if (savedOnly && !savedIds.includes(item.id)) return false;
    if (category !== "All" && item.category !== category) return false;
    if (type !== "All" && item.type !== type) return false;
    if (!q) return true;
    return (
      item.title.toLowerCase().includes(q) ||
      item.summary.toLowerCase().includes(q) ||
      item.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  });
}

export function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function formatPostedAt(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(y, m - 1, d));
}

export const TYPE_LABELS: Record<ContentType, string> = {
  pdf: "PDF",
  video: "Video",
  doc: "Doc",
};
