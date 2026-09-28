import {
  articlesService,
  cannedResponsesService,
  categoriesService,
  customersService,
  departmentsService,
  helpTopicsService,
  organizationsService,
  slaPlansService,
  staffService,
  teamsService,
} from "@/services";
import { createCrudStore } from "./create-collection-store";

export const useCustomersStore = createCrudStore("customers", customersService);
export const useOrganizationsStore = createCrudStore("organizations", organizationsService);

export const useStaffStore = createCrudStore("staff", staffService);
export const useDepartmentsStore = createCrudStore("departments", departmentsService);
export const useTeamsStore = createCrudStore("teams", teamsService);
export const useSlaPlansStore = createCrudStore("slaPlans", slaPlansService);

export const useHelpTopicsStore = createCrudStore("helpTopics", helpTopicsService);
export const useArticlesStore = createCrudStore("articles", articlesService);
export const useFaqCategoriesStore = createCrudStore("faqCategories", categoriesService);
export const useCannedResponsesStore = createCrudStore("cannedResponses", cannedResponsesService);
