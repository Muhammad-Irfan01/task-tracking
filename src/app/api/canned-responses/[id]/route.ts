import { cannedResponses } from "@/server/domain/content";
import { itemRoutes } from "@/server/http";

export const { GET, PATCH, DELETE } = itemRoutes(cannedResponses);
