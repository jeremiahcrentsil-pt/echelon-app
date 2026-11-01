import {
  Activity,
  Apple,
  BookOpen,
  Camera,
  ClipboardCheck,
  Dumbbell,
  Library,
  ScanBarcode,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/workouts",
    label: "Workouts",
    description: "Log sessions, sets, reps, and notes.",
    icon: Dumbbell,
  },
  {
    href: "/nutrition",
    label: "Nutrition",
    description: "Track daily food intake against your targets.",
    icon: Apple,
  },
  {
    href: "/scan",
    label: "Scan",
    description: "Look up foods by barcode and add them to your log.",
    icon: ScanBarcode,
  },
  {
    href: "/check-ins",
    label: "Check-ins",
    description: "Submit periodic check-ins for your coach to review.",
    icon: ClipboardCheck,
  },
  {
    href: "/meal-plans",
    label: "Meal plans",
    description: "Follow the meal plans assigned to you.",
    icon: UtensilsCrossed,
  },
  {
    href: "/exercises",
    label: "Exercises",
    description: "Browse the exercise library with cues and variations.",
    icon: Library,
  },
  {
    href: "/content",
    label: "Content",
    description: "Watch and read coaching resources posted for you.",
    icon: BookOpen,
  },
  {
    href: "/monitoring",
    label: "Monitoring",
    description: "Complete short daily monitoring forms.",
    icon: Activity,
  },
  {
    href: "/progress-photos",
    label: "Progress photos",
    description: "Capture dated photos to track visual progress.",
    icon: Camera,
  },
];
