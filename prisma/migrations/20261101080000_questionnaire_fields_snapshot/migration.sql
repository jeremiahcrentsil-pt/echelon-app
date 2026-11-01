-- AlterTable: snapshot onboarding fields per assignment so template edits don't rewrite history
ALTER TABLE "QuestionnaireAssignment" ADD COLUMN "fieldsSnapshot" TEXT;
