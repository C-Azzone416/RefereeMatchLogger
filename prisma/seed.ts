import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 12);

  const user = await db.user.upsert({
    where: { email: "test@referee.local" },
    update: {},
    create: {
      email: "test@referee.local",
      passwordHash,
      name: "Test Referee",
      badgeNumber: "TEST-001",
      currentGrade: "Grade 8",
      state: "California",
    },
  });

  console.log("Test user ready:");
  console.log("  Email:    test@referee.local");
  console.log("  Password: password123");
  console.log("  ID:", user.id);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
