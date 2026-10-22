import type { ContentItem } from "./content";
import type { WorkspaceId } from "./workspaces";
export function sampleContent(workspace: WorkspaceId): ContentItem[] {
  const titles =
    workspace === "shapes-and-pieces"
      ? [
          "A little sparkle, a lot of you",
          "The festive edit is here",
          "How to style your statement earrings",
          "Meet your new everyday favourites",
        ]
      : [
          "Small details. Big personality.",
          "Your autumn style refresh",
          "The art of effortless accessorising",
          "A closer look at the new collection",
        ];
  return titles.map((title, i) => ({
    id: `00000000-0000-4000-8000-00000000000${i + 1}`,
    workspace,
    kind: (["reel", "email", "blog", "post"] as const)[i],
    title,
    body: [
      "A closer look at pieces made for your most memorable moments. Discover your next favourite.",
      "Discover the new edit: thoughtful details, beautiful finishes and something just for you.",
      "Start with one statement piece. Build your look around its colour, shape and occasion, then keep the remaining accessories beautifully simple.",
      "New season. New favourites. Which piece would you choose?",
    ][i],
    channel: (["Instagram", "Email", "Website", "TikTok"] as const)[i],
    status: i === 2 ? "draft" : "planned",
    scheduledAt:
      i === 2 ? null : new Date(Date.now() + (i + 1) * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  }));
}
export const sampleSeries = [
  { day: "01 Oct", social: 3800, email: 1800, organic: 1200 },
  { day: "05 Oct", social: 5200, email: 2400, organic: 1800 },
  { day: "10 Oct", social: 4300, email: 2100, organic: 2100 },
  { day: "15 Oct", social: 7400, email: 3800, organic: 2600 },
  { day: "20 Oct", social: 6500, email: 3100, organic: 3200 },
  { day: "25 Oct", social: 8800, email: 4400, organic: 3700 },
  { day: "30 Oct", social: 10200, email: 4900, organic: 4300 },
];
