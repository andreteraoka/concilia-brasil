import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";

async function main() {
  const company = await prisma.company.create({
    data: {
      name: "Empresa 2",
      cnpj: "11111111111111",
    },
  });

  logger.info("Company created successfully", { companyId: company.id, name: company.name });
}

main()
  .catch((error) => {
    logger.error("Database script failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });