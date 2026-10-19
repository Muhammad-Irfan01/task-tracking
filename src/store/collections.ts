import {
  articlesService,
  cannedResponsesService,
  categoriesService,
  customersService,
  departmentsService,
  employeesService,
  helpTopicsService,
  organizationsService,
  slaPlansService,
  staffService,
  teamsService,
  ticketCategoriesService,
  ticketSubcategoriesService,
} from "@/services";
import { createCrudStore } from "./create-collection-store";

export const useCustomersStore = createCrudStore("customers", customersService);
export const useOrganizationsStore = createCrudStore("organizations", organizationsService);

export const useStaffStore = createCrudStore("staff", staffService);
export const useEmployeesStore = createCrudStore("employees", employeesService);
export const useDepartmentsStore = createCrudStore("departments", departmentsService);
export const useTeamsStore = createCrudStore("teams", teamsService);
export const useSlaPlansStore = createCrudStore("slaPlans", slaPlansService);

export const useHelpTopicsStore = createCrudStore("helpTopics", helpTopicsService);
export const useArticlesStore = createCrudStore("articles", articlesService);
export const useFaqCategoriesStore = createCrudStore("faqCategories", categoriesService);
export const useCannedResponsesStore = createCrudStore("cannedResponses", cannedResponsesService);
/** Every mutation refreshes the other loaded stores, so departments pick up category changes for the ticket forms. */
export const useTicketCategoriesStore = createCrudStore("ticketCategories", ticketCategoriesService);
export const useTicketSubcategoriesStore = createCrudStore("ticketSubcategories", ticketSubcategoriesService);
