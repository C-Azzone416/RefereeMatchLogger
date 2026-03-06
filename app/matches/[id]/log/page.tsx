import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import GameLog from "./GameLog";

export default async function GameLogPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session.userId) redirect("/login");

  const { id } = await params;
  const match = await db.match.findFirst({
    where: { id, userId: session.userId },
    include: { events: { orderBy: { createdAt: "asc" } } },
  });

  if (!match) redirect("/dashboard");

  const serialized = {
    ...match,
    date: match.date.toISOString(),
    createdAt: match.createdAt.toISOString(),
    updatedAt: match.updatedAt.toISOString(),
    events: match.events.map((e) => ({
      ...e,
      createdAt: e.createdAt.toISOString(),
    })),
  };

  return <GameLog match={serialized} />;
}
