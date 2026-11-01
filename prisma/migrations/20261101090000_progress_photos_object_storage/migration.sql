-- Move progress photo binaries out of the database into object storage keys/URLs.
-- Existing in-DB dataUrl blobs cannot be reconstructed as objects here — clear and re-upload.

DELETE FROM "ProgressPhoto";

ALTER TABLE "ProgressPhoto" DROP COLUMN "dataUrl";
ALTER TABLE "ProgressPhoto" ADD COLUMN "objectKey" TEXT NOT NULL;
ALTER TABLE "ProgressPhoto" ADD COLUMN "url" TEXT NOT NULL;

CREATE INDEX "ProgressPhoto_objectKey_idx" ON "ProgressPhoto"("objectKey");
