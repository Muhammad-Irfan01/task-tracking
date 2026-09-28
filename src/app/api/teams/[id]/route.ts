import { teams } from "@/server/domain/directory";
import { itemRoutes } from "@/server/http";

export const { GET, PATCH, DELETE } = itemRoutes(teams);
