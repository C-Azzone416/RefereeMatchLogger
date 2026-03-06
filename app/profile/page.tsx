import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import ProfileForm from "./ProfileForm";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session.userId) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      name: true,
      email: true,
      badgeNumber: true,
      currentGrade: true,
      state: true,
    },
  });

  if (!user) redirect("/login");

  return <ProfileForm user={user} />;
}
