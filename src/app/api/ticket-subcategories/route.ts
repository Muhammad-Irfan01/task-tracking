import { ticketSubcategoriesResource } from "@/server/domain/categories";
import { collectionRoutes } from "@/server/http";

export const { GET, POST } = collectionRoutes(ticketSubcategoriesResource, { adminWrites: true });
