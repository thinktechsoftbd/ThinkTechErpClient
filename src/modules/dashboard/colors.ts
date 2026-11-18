// Chart colours, shared by the server-rendered sections and the client charts. (A plain value exported from a
// "use client" file reaches server components only as a reference, not the value, so they live here.)

/** `text` sets currentColor, which gradient washes under lines use. */
export type SeriesColor = { stroke: string; fill: string; dot: string; text: string };

// Validated for colour-blind separation, light and dark: sales blue, its previous period a lighter step of the
// same blue, purchases aqua. Text never wears these; they only fill marks and legend dots.
export const SERIES = {
  sales: {
    stroke: "stroke-[#2a78d6] dark:stroke-[#3987e5]",
    fill: "fill-[#2a78d6] dark:fill-[#3987e5]",
    dot: "bg-[#2a78d6] dark:bg-[#3987e5]",
    text: "text-[#2a78d6] dark:text-[#3987e5]",
  },
  previous: {
    stroke: "stroke-[#9ec5f4] dark:stroke-[#256abf]",
    fill: "fill-[#9ec5f4] dark:fill-[#256abf]",
    dot: "bg-[#9ec5f4] dark:bg-[#256abf]",
    text: "text-[#9ec5f4] dark:text-[#256abf]",
  },
  purchase: {
    stroke: "stroke-[#1baf7a] dark:stroke-[#199e70]",
    fill: "fill-[#1baf7a] dark:fill-[#199e70]",
    dot: "bg-[#1baf7a] dark:bg-[#199e70]",
    text: "text-[#1baf7a] dark:text-[#199e70]",
  },
} as const satisfies Record<string, SeriesColor>;

/**
 * Decorative tints for the stat tiles and panel icons (not data colours): each tile's wash, border, icon chip
 * and corner glow. Blue = sales, green = purchase, violet = claims, orange = active warranty.
 */
export const TONES = {
  blue: {
    card: "border-blue-100 bg-linear-to-br from-blue-50 via-blue-50/60 to-white dark:border-blue-500/20 dark:from-blue-500/15 dark:via-blue-500/5 dark:to-transparent",
    chip: "bg-blue-100 text-blue-600 ring-4 ring-blue-50 dark:bg-blue-500/20 dark:text-blue-300 dark:ring-blue-500/10",
    glow: "bg-blue-400/15 dark:bg-blue-400/10",
  },
  green: {
    card: "border-emerald-100 bg-linear-to-br from-emerald-50 via-emerald-50/60 to-white dark:border-emerald-500/20 dark:from-emerald-500/15 dark:via-emerald-500/5 dark:to-transparent",
    chip: "bg-emerald-100 text-emerald-600 ring-4 ring-emerald-50 dark:bg-emerald-500/20 dark:text-emerald-300 dark:ring-emerald-500/10",
    glow: "bg-emerald-400/15 dark:bg-emerald-400/10",
  },
  violet: {
    card: "border-violet-100 bg-linear-to-br from-violet-50 via-violet-50/60 to-white dark:border-violet-500/20 dark:from-violet-500/15 dark:via-violet-500/5 dark:to-transparent",
    chip: "bg-violet-100 text-violet-600 ring-4 ring-violet-50 dark:bg-violet-500/20 dark:text-violet-300 dark:ring-violet-500/10",
    glow: "bg-violet-400/15 dark:bg-violet-400/10",
  },
  orange: {
    card: "border-orange-100 bg-linear-to-br from-orange-50 via-orange-50/60 to-white dark:border-orange-500/20 dark:from-orange-500/15 dark:via-orange-500/5 dark:to-transparent",
    chip: "bg-orange-100 text-orange-600 ring-4 ring-orange-50 dark:bg-orange-500/20 dark:text-orange-300 dark:ring-orange-500/10",
    glow: "bg-orange-400/15 dark:bg-orange-400/10",
  },
  indigo: {
    card: "border-indigo-100 bg-linear-to-br from-indigo-50 to-white dark:border-indigo-500/20 dark:from-indigo-500/15 dark:to-transparent",
    chip: "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300",
    glow: "bg-indigo-400/15 dark:bg-indigo-400/10",
  },
  amber: {
    card: "border-amber-100 bg-linear-to-br from-amber-50 to-white dark:border-amber-500/20 dark:from-amber-500/15 dark:to-transparent",
    chip: "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300",
    glow: "bg-amber-400/15 dark:bg-amber-400/10",
  },
} as const;

export type Tone = keyof typeof TONES;

/** Part colours: the categorical order (blue, orange, aqua, yellow) for categories, grey for "Others". */
export const CATEGORY_COLORS = [
  { stroke: "stroke-[#2a78d6] dark:stroke-[#3987e5]", dot: "bg-[#2a78d6] dark:bg-[#3987e5]" },
  { stroke: "stroke-[#eb6834] dark:stroke-[#d95926]", dot: "bg-[#eb6834] dark:bg-[#d95926]" },
  { stroke: "stroke-[#1baf7a] dark:stroke-[#199e70]", dot: "bg-[#1baf7a] dark:bg-[#199e70]" },
  { stroke: "stroke-[#eda100] dark:stroke-[#c98500]", dot: "bg-[#eda100] dark:bg-[#c98500]" },
];
export const OTHER_COLOR = { stroke: "stroke-gray-300 dark:stroke-gray-600", dot: "bg-gray-300 dark:bg-gray-600" };

/** The reserved status colours for warranty states; each is shown with its name beside it. */
export const STATUS_COLORS = {
  good: { stroke: "stroke-[#0ca30c]", dot: "bg-[#0ca30c]" },
  warning: { stroke: "stroke-[#fab219]", dot: "bg-[#fab219]" },
  ended: { stroke: "stroke-gray-300 dark:stroke-gray-600", dot: "bg-gray-300 dark:bg-gray-600" },
};
