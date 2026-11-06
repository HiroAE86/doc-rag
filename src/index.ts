import { serve } from "bun";
import index from "./index.html";
import { embedHandler } from "./handlers/embed";
import { documentsHandler } from "./handlers/documents";
import { startIndexingHandler, getIndexingJobHandler, listIndexingJobsHandler } from "./handlers/indexing";
import { helloHandler } from "./handlers/hello";

const server = serve({
  routes: {
    // Serve index.html for all unmatched routes.
    "/*": index,

    "/api/embed": {
      POST: embedHandler,
    },

    "/api/docs": {
      POST: documentsHandler,
    },

    "/api/index": { GET: listIndexingJobsHandler, POST: startIndexingHandler },
    "/api/index/:id": { GET: getIndexingJobHandler },

    "/api/hello/:name": helloHandler,
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
