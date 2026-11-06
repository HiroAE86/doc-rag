import type { BunRequest } from "bun";

export function helloHandler(req: BunRequest<"/api/hello/:name">) {
  return Response.json({ message: `Hello, ${req.params.name}!` });
}
