-- CreateTable
CREATE TABLE "SupplementalReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matchId" TEXT NOT NULL,
    "gameEventId" TEXT,
    "incidentType" TEXT NOT NULL,
    "team" TEXT,
    "playerName" TEXT,
    "playerNumber" TEXT,
    "officialName" TEXT,
    "officialRole" TEXT,
    "minute" INTEGER,
    "stoppageTime" INTEGER,
    "period" TEXT,
    "fieldLocation" TEXT,
    "offenseCode" TEXT,
    "narrative" TEXT,
    "details" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "submittedAt" DATETIME,
    "submittedTo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SupplementalReport_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SupplementalReport_gameEventId_fkey" FOREIGN KEY ("gameEventId") REFERENCES "GameEvent" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "SupplementalReport_gameEventId_key" ON "SupplementalReport"("gameEventId");
