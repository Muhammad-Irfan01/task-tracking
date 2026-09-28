import { slaPlans } from "@/server/domain/directory";
import { itemRoutes } from "@/server/http";

export const { GET, PATCH, DELETE } = itemRoutes(slaPlans);
