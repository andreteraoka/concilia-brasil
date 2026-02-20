CREATE TABLE "Account" (
  "id" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "agency" TEXT,
    "accountNumber" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_documentId_fkey";
ALTER TABLE "Transaction" ADD COLUMN "accountId" TEXT NOT NULL;
ALTER TABLE "Transaction" ADD COLUMN "companyId" TEXT NOT NULL;
ALTER TABLE "Transaction" ALTER COLUMN "documentId" DROP NOT NULL;

ALTER TABLE "Account" ADD CONSTRAINT "Account_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
