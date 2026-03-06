-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Match" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "venue" TEXT NOT NULL,
    "field" TEXT,
    "competitionName" TEXT NOT NULL,
    "ageGroup" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "competitionLevel" TEXT NOT NULL,
    "homeTeam" TEXT NOT NULL,
    "awayTeam" TEXT NOT NULL,
    "homeJerseyColor" TEXT,
    "awayJerseyColor" TEXT,
    "homeHeadCoach" TEXT,
    "awayHeadCoach" TEXT,
    "halfLength" INTEGER NOT NULL DEFAULT 45,
    "homeScore" INTEGER NOT NULL DEFAULT 0,
    "awayScore" INTEGER NOT NULL DEFAULT 0,
    "halfTimeHomeScore" INTEGER,
    "halfTimeAwayScore" INTEGER,
    "extraTime" BOOLEAN NOT NULL DEFAULT false,
    "penalties" BOOLEAN NOT NULL DEFAULT false,
    "role" TEXT NOT NULL,
    "centerRefName" TEXT,
    "centerRefBadge" TEXT,
    "narrative" TEXT,
    "matchAbandoned" BOOLEAN NOT NULL DEFAULT false,
    "abandonReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Match_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Match" ("abandonReason", "ageGroup", "awayHeadCoach", "awayJerseyColor", "awayScore", "awayTeam", "centerRefBadge", "centerRefName", "competitionLevel", "competitionName", "createdAt", "date", "extraTime", "field", "gender", "halfTimeAwayScore", "halfTimeHomeScore", "homeHeadCoach", "homeJerseyColor", "homeScore", "homeTeam", "id", "matchAbandoned", "narrative", "penalties", "role", "updatedAt", "userId", "venue") SELECT "abandonReason", "ageGroup", "awayHeadCoach", "awayJerseyColor", "awayScore", "awayTeam", "centerRefBadge", "centerRefName", "competitionLevel", "competitionName", "createdAt", "date", "extraTime", "field", "gender", "halfTimeAwayScore", "halfTimeHomeScore", "homeHeadCoach", "homeJerseyColor", "homeScore", "homeTeam", "id", "matchAbandoned", "narrative", "penalties", "role", "updatedAt", "userId", "venue" FROM "Match";
DROP TABLE "Match";
ALTER TABLE "new_Match" RENAME TO "Match";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
