import { ticketSubcategoriesResource } from "@/server/domain/categories";
import { itemRoutes } from "@/server/http";

export const { GET, PATCH, DELETE } = itemRoutes(ticketSubcategoriesResource, { adminWrites: true });
