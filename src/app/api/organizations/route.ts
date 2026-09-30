import { organizations } from "@/server/domain/directory";
import { collectionRoutes } from "@/server/http";

export const { GET, POST } = collectionRoutes(organizations, { adminWrites: true });
