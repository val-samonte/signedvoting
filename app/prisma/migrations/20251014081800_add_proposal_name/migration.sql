/*
  Warnings:

  - Added the required column `name` to the `proposals` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_proposals" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "author_id" INTEGER NOT NULL,
    "payer" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "choices" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "proposals_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_proposals" ("author_id", "choices", "created_at", "description", "hash", "id", "payer", "updated_at") SELECT "author_id", "choices", "created_at", "description", "hash", "id", "payer", "updated_at" FROM "proposals";
DROP TABLE "proposals";
ALTER TABLE "new_proposals" RENAME TO "proposals";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
