import { redirect, notFound } from "next/navigation";
import { access } from "@/lib/auth";
import { modules, type Module } from "@/lib/workspaces";
import { Workspace } from "@/components/workspace";
export default async function Page({
  params,
}: {
  params: Promise<{ section?: string[] }>;
}) {
  const result = await access();
  if (!result.ok) redirect("/sign-in");
  const { section } = await params;
  const module = section?.[0] ?? "overview";
  if ((section?.length ?? 0) > 1 || !modules.includes(module as Module))
    notFound();
  return <Workspace module={module as Module} demo={false} />;
}
