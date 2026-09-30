import { departments } from "@/server/domain/directory";
import { itemRoutes } from "@/server/http";

export const { GET, PATCH, DELETE } = itemRoutes(departments, { adminWrites: true });
