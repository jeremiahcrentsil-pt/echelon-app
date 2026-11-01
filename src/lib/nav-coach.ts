import {
  BookPlus,
  ClipboardList,
  Dumbbell,
  FormInput,
  LayoutDashboard,
  NotebookPen,
  Users,
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
    href: "/coach/clients",
    label: "Clients",
    description: "Invite clients and review onboarding.",
    icon: Users,
  },
  {
    href: "/coach/questionnaire",
    label: "Questionnaire",
    description: "Edit the onboarding form fields.",
    icon: FormInput,
  },
  {
    href: "/coach/programs",
    label: "Programs",
    description: "Build multi-week workout programs.",
    icon: Dumbbell,
  },
  {
    href: "/coach/plans",
    label: "Meal plans",
    description: "Create and assign meal plans.",
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
