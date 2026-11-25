import { z } from "zod";

export const videoDraft = z.object({
  workspace: z.enum(["foxyavenue", "shapes-and-pieces"]),
  title: z.string().trim().min(2).max(120),
  imageUrl: z.string().url().max(2000),
  motionPrompt: z.string().trim().min(10).max(1500),
  hook: z.string().trim().min(2).max(300),
  voiceover: z.string().trim().max(2000),
  caption: z.string().trim().min(2).max(2200),
}).superRefine((value, ctx) => {
  if (!publicHttpsUrl(value.imageUrl)) ctx.addIssue({code:"custom",path:["imageUrl"],message:"Use a public HTTPS product image URL."});
});

export function publicHttpsUrl(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return url.protocol === "https:" && !url.username && !url.password && !url.port &&
      host.includes(".") && host !== "localhost" && !host.endsWith(".local") &&
      !host.endsWith(".internal") && !/^\d+\.\d+\.\d+\.\d+$/.test(host) &&
      !host.startsWith("[" ) && !host.endsWith(".localhost");
  } catch { return false; }
}

export function generationPrompt(input: {motion_prompt:string;hook:string}) {
  return `${input.motion_prompt}\nVertical 9:16 product video, 5 seconds. Keep the actual jewellery design, stones, colours and proportions faithful to the source photo. Natural hand-held UGC feel, no added text, logos, invented products or altered jewellery. Opening hook concept: ${input.hook}`;
}
