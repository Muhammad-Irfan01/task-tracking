import { apiClient, unwrap } from "./api-client";

export interface ResourceService<T, I> {
  list: () => Promise<T[]>;
  get: (id: number | string) => Promise<T>;
  create: (input: I) => Promise<T>;
  update: (id: number | string, changes: Partial<I>) => Promise<T>;
  remove: (id: number | string) => Promise<{ id: number }>;
}

/** Standard REST client for `/api/<path>` + `/api/<path>/:id`. */
export function createResourceService<T, I>(path: string): ResourceService<T, I> {
  return {
    list: () => unwrap<T[]>(apiClient.get(path)),
    get: (id) => unwrap<T>(apiClient.get(`${path}/${id}`)),
    create: (input) => unwrap<T>(apiClient.post(path, input)),
    update: (id, changes) => unwrap<T>(apiClient.patch(`${path}/${id}`, changes)),
    remove: (id) => unwrap<{ id: number }>(apiClient.delete(`${path}/${id}`)),
  };
}
