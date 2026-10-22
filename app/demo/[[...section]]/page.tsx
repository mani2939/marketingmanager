import { notFound } from "next/navigation";
import { modules, type Module } from "@/lib/workspaces";
import { Workspace } from "@/components/workspace";
export default async function Page({
  params,
}: {
  params: Promise<{ section?: string[] }>;
}) {
  if (process.env.ENABLE_DEMO !== "true") notFound();
  const { section } = await params;
  const module = section?.[0] ?? "overview";
  if ((section?.length ?? 0) > 1 || !modules.includes(module as Module))
    notFound();
  return <Workspace module={module as Module} demo />;
}
