import {
  CalendarDays,
  Flower2,
  Flame,
  Landmark,
  Mountain,
  Sparkles,
  SunMedium,
  Waves,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type SceneId =
  | "doors"
  | "approach"
  | "pillars"
  | "mandapam"
  | "sanctum"
  | "darshan"
  | "history"
  | "festivals"
  | "blessing";

export type Chapter = {
  id: SceneId;
  number: string;
  label: string;
};

export const chapters: Chapter[] = [
  { id: "doors", number: "01", label: "Doors" },
  { id: "approach", number: "02", label: "Approach" },
  { id: "pillars", number: "03", label: "Pillars" },
  { id: "mandapam", number: "04", label: "Garuda Mandapam" },
  { id: "sanctum", number: "05", label: "Sanctum" },
  { id: "darshan", number: "06", label: "Darshan" },
  { id: "history", number: "07", label: "History" },
  { id: "festivals", number: "08", label: "Festivals" },
  { id: "blessing", number: "09", label: "Blessing" },
];

export type TimelineItem = {
  period: string;
  title: string;
  body: string;
  icon: LucideIcon;
};

export const historyTimeline: TimelineItem[] = [
  {
    period: "Ancient hill shrine",
    title: "Seshachalam as sacred ascent",
    body: "The seven hills are revered as a living temple landscape, with the climb itself treated as part of the offering.",
    icon: Mountain,
  },
  {
    period: "Medieval inscriptions",
    title: "Dynasties preserve the worship",
    body: "Pallava, Chola, Pandya, and Vijayanagara patrons left gifts, inscriptions, and temple service traditions across centuries.",
    icon: Landmark,
  },
  {
    period: "Vijayanagara era",
    title: "Mandapams, processions, and music",
    body: "Royal patronage expanded ceremonial spaces and strengthened the festival culture that still shapes Tirumala's rhythm.",
    icon: Flame,
  },
  {
    period: "Modern stewardship",
    title: "Darshan for millions",
    body: "The temple's administration and volunteer systems support one of the world's most visited places of worship.",
    icon: Waves,
  },
];

export type Festival = {
  title: string;
  season: string;
  body: string;
  icon: LucideIcon;
};

export const festivals: Festival[] = [
  {
    title: "Srivari Brahmotsavam",
    season: "Annual grand procession",
    body: "The temple streets glow with vahanam processions, music, lamps, and waves of devotees chanting Govinda.",
    icon: Sparkles,
  },
  {
    title: "Vaikunta Ekadasi",
    season: "Sacred threshold",
    body: "A day centered on auspicious darshan, inner passage, and the hope of crossing into divine grace.",
    icon: SunMedium,
  },
  {
    title: "Rathasapthami",
    season: "Surya Prabha",
    body: "From dawn to night, processional forms are celebrated through changing light and devotional movement.",
    icon: CalendarDays,
  },
  {
    title: "Pushpayagam",
    season: "Flower offering",
    body: "The sanctum is imagined in fragrance and color, with blossoms offered as a living garland of gratitude.",
    icon: Flower2,
  },
];

export const journeyProgress: Record<SceneId, number> = {
  doors: 0,
  approach: 0.08,
  pillars: 0.28,
  mandapam: 0.5,
  sanctum: 0.68,
  darshan: 0.86,
  history: 1,
  festivals: 1,
  blessing: 1,
};
