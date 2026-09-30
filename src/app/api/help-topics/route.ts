import { helpTopics } from "@/server/domain/directory";
import { collectionRoutes } from "@/server/http";

export const { GET, POST } = collectionRoutes(helpTopics, { adminWrites: true });
