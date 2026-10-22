export const workspaces = {
  "shapes-and-pieces": {
    name: "Shapes and Pieces",
    domain: "www.shapesandpieces.com",
    initials: "SP",
    tone: "Heritage-inspired. Beautifully modern.",
    color: "#9273d5",
  },
  foxyavenue: {
    name: "Foxyavenue",
    domain: "www.foxyavenue.com",
    initials: "FA",
    tone: "Everyday style. Extraordinary details.",
    color: "#d29173",
  },
} as const;
export type WorkspaceId = keyof typeof workspaces;
export function isWorkspace(value: string): value is WorkspaceId {
  return Object.hasOwn(workspaces, value);
}
export const modules = [
  "overview",
  "social",
  "highlights",
  "reels",
  "schedule",
  "email",
  "seo",
  "blogs",
  "settings",
] as const;
export type Module = (typeof modules)[number];
