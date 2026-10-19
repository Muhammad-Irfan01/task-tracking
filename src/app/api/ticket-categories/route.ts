import { ticketCategoriesResource } from "@/server/domain/categories";
import { collectionRoutes } from "@/server/http";

export const { GET, POST } = collectionRoutes(ticketCategoriesResource, { adminWrites: true });
