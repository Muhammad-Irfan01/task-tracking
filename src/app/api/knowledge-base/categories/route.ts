import { categories } from "@/server/domain/content";
import { collectionRoutes } from "@/server/http";

export const { GET, POST } = collectionRoutes(categories);
