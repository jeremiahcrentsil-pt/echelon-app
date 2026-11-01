-- CreateTable
CREATE TABLE "ClientInvite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "templateId" TEXT,
    "acceptedUserId" TEXT,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ClientInvite_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClientInvite_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "QuestionnaireTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ClientInvite_acceptedUserId_fkey" FOREIGN KEY ("acceptedUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuestionnaireTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "coachId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "fields" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "QuestionnaireTemplate_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuestionnaireAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "inviteId" TEXT,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "QuestionnaireAssignment_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "QuestionnaireTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QuestionnaireAssignment_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "ClientInvite" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "QuestionnaireAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuestionnaireSubmission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assignmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "answers" TEXT NOT NULL,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" DATETIME,
    "coachNote" TEXT,
    CONSTRAINT "QuestionnaireSubmission_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "QuestionnaireAssignment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "QuestionnaireSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "phase" TEXT,
    "coachId" TEXT,
    "onboardingCompletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("createdAt", "email", "id", "name", "passwordHash", "phase", "role", "updatedAt") SELECT "createdAt", "email", "id", "name", "passwordHash", "phase", "role", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ClientInvite_token_key" ON "ClientInvite"("token");

-- CreateIndex
CREATE UNIQUE INDEX "ClientInvite_acceptedUserId_key" ON "ClientInvite"("acceptedUserId");

-- CreateIndex
CREATE INDEX "ClientInvite_coachId_status_idx" ON "ClientInvite"("coachId", "status");

-- CreateIndex
CREATE INDEX "ClientInvite_email_idx" ON "ClientInvite"("email");

-- CreateIndex
CREATE INDEX "QuestionnaireTemplate_coachId_idx" ON "QuestionnaireTemplate"("coachId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionnaireAssignment_inviteId_key" ON "QuestionnaireAssignment"("inviteId");

-- CreateIndex
CREATE INDEX "QuestionnaireAssignment_userId_status_idx" ON "QuestionnaireAssignment"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionnaireSubmission_assignmentId_key" ON "QuestionnaireSubmission"("assignmentId");

-- CreateIndex
CREATE INDEX "QuestionnaireSubmission_userId_idx" ON "QuestionnaireSubmission"("userId");
