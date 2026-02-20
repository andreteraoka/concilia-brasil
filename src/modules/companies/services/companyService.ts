import { companyRepository } from "../repositories/companyRepository";

export const companyService = {
  async getMyCompany(companyId: string) {
    const company = await companyRepository.findById(companyId);
    return { company };
  },
};
