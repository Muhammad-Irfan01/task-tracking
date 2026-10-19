import type { ArticleInput, CannedResponseInput, FaqCategoryInput, TicketCategoryInput, TicketSubcategoryInput } from "@/lib/schemas";
import type { CannedResponse, FaqArticle, FaqCategory, TicketCategoryEntry, TicketSubcategoryEntry } from "@/types";
import { apiClient, unwrap } from "./api-client";
import { createResourceService } from "./resource.service";

export const articlesService = {
  ...createResourceService<FaqArticle, ArticleInput>("/knowledge-base/articles"),
  recordView: (id: number | string) => unwrap<FaqArticle>(apiClient.post(`/knowledge-base/articles/${id}/view`)),
};
export const categoriesService = createResourceService<FaqCategory, FaqCategoryInput>("/knowledge-base/categories");
export const cannedResponsesService = createResourceService<CannedResponse, CannedResponseInput>("/canned-responses");

export const ticketCategoriesService = createResourceService<TicketCategoryEntry, TicketCategoryInput>("/ticket-categories");
export const ticketSubcategoriesService = createResourceService<TicketSubcategoryEntry, TicketSubcategoryInput>("/ticket-subcategories");
