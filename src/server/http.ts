import { NextResponse, type NextRequest } from "next/server";
import type { PlatformUser, SessionUser } from "@/types";
import { requirePlatformUser, requireUser } from "./auth";
import { forbidden, HttpError } from "./errors";
import type { Resource } from "./resource";
import { withTenant } from "./tenant";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

export function created<T>(data: T) {
  return ok(data, { status: 201 });
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "Request body must be valid JSON");
  }
}

type Context<P> = { params: Promise<P> };
type Handler<P> = (args: { request: NextRequest; params: P; user: SessionUser }) => Promise<Response> | Response;
type PlatformHandler<P> = (args: { request: NextRequest; params: P; user: PlatformUser }) => Promise<Response> | Response;

function errorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ message: error.message, errors: error.errors }, { status: error.status });
  }
  console.error(error);
  return NextResponse.json({ message: "Something went wrong on our side" }, { status: 500 });
}

/**
 * Wraps a route handler with authentication and uniform error responses.
 * Authenticated handlers run inside the user's tenant, so every query they
 * make is limited to that organization's data. Employees (portal users) are
 * refused everywhere except routes marked `portal: true`.
 */
export function route<P = Record<string, never>>(handler: Handler<P>, { auth = true, portal = false } = {}) {
  return async (request: NextRequest, context: Context<P>) => {
    try {
      const params = context?.params ? await context.params : ({} as P);
      if (!auth) return await handler({ request, params, user: null as unknown as SessionUser });
      const user = await requireUser();
      if (user.kind === "employee" && !portal) throw forbidden("This is only available to agents");
      return await withTenant(user.tenantId, () => handler({ request, params, user }));
    } catch (error) {
      return errorResponse(error);
    }
  };
}

/** Route handler for the employee portal: employees only, inside their tenant. */
export function portalRoute<P = Record<string, never>>(handler: Handler<P>) {
  return route<P>(
    (args) => {
      if (args.user.kind !== "employee") throw forbidden("The portal is for employees; agents use the desk");
      return handler(args);
    },
    { portal: true },
  );
}

/** Route handler for the platform console; only super admins get through. */
export function platformRoute<P = Record<string, never>>(handler: PlatformHandler<P>) {
  return async (request: NextRequest, context: Context<P>) => {
    try {
      const user = await requirePlatformUser();
      const params = context?.params ? await context.params : ({} as P);
      return await handler({ request, params, user });
    } catch (error) {
      return errorResponse(error);
    }
  };
}

type WriteAccess = { adminWrites?: boolean };

/** With `adminWrites`, any agent may read but only admins may create, edit or delete. */
function checkWrite(user: SessionUser, { adminWrites = false }: WriteAccess) {
  if (adminWrites && !user.isAdmin) throw forbidden("Only administrators can change this");
}

/** GET (list) + POST (create) handlers for a collection endpoint. */
export function collectionRoutes<V>(resource: Resource<V>, access: WriteAccess = {}) {
  return {
    GET: route(async () => ok(await resource.list())),
    POST: route(async ({ request, user }) => {
      checkWrite(user, access);
      return created(await resource.create(await readJson(request)));
    }),
  };
}

/** GET / PATCH / DELETE handlers for an item endpoint. */
export function itemRoutes<V>(resource: Resource<V>, access: WriteAccess = {}) {
  return {
    GET: route<{ id: string }>(async ({ params }) => ok(await resource.get(params.id))),
    PATCH: route<{ id: string }>(async ({ request, params, user }) => {
      checkWrite(user, access);
      return ok(await resource.update(params.id, await readJson(request)));
    }),
    DELETE: route<{ id: string }>(async ({ params, user }) => {
      checkWrite(user, access);
      return ok(await resource.remove(params.id));
    }),
  };
}
