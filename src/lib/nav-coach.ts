import {
  BookPlus,
  ClipboardList,
  LayoutDashboard,
  NotebookPen,
  type LucideIcon,
} from "lucide-react";

export type CoachNavItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

export const COACH_NAV_ITEMS: CoachNavItem[] = [
  {
    href: "/coach",
    label: "Overview",
    description: "Roster pulse and shortcuts.",
    icon: LayoutDashboard,
  },
  {
    href: "/coach/plans",
    label: "Assign plans",
    description: "Meal and workout plans for clients.",
    icon: NotebookPen,
  },
  {
    href: "/coach/content",
    label: "Post content",
    description: "Add PDFs, videos, and docs.",
    icon: BookPlus,
  },
  {
    href: "/coach/check-ins",
    label: "Review check-ins",
    description: "Read submissions and leave notes.",
    icon: ClipboardList,
  },
];
