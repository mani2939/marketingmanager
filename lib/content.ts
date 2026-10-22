import { z } from "zod";
export const contentSchema = z
  .object({
    id: z.string().uuid(),
    workspace: z.enum(["shapes-and-pieces", "foxyavenue"]),
    kind: z.enum(["post", "reel", "email", "blog"]),
    title: z.string().trim().min(1).max(160),
    body: z.string().max(20000),
    channel: z.enum(["Instagram", "TikTok", "Facebook", "Email", "Website"]),
    status: z.enum(["draft", "planned"]),
    scheduledAt: z.string().datetime().nullable(),
    updatedAt: z.string().datetime(),
  })
  .superRefine((item, ctx) => {
    if (
      item.status === "planned" &&
      (!item.scheduledAt || Date.parse(item.scheduledAt) <= Date.now())
    )
      ctx.addIssue({
        code: "custom",
        path: ["scheduledAt"],
        message: "Choose a future date and time.",
      });
    if (
      (item.kind === "email" && item.channel !== "Email") ||
      (item.kind === "blog" && item.channel !== "Website") ||
      (["post", "reel"].includes(item.kind) &&
        ["Email", "Website"].includes(item.channel))
    )
      ctx.addIssue({
        code: "custom",
        path: ["channel"],
        message: "Channel does not match content type.",
      });
  });
export type ContentItem = z.infer<typeof contentSchema>;
export function csvCell(value: string) {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}
