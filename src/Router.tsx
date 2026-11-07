import { App } from "./App";
import { DocumentationApp } from "./documentation/DocumentationApp";

export function Router() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";

  switch (path) {
    case "/":
      return <App />;
    case "/docs":
      return <DocumentationApp />;
    default:
      return <main className="container mx-auto p-8"><h1>Page not found</h1><a href="/">Return to RAG workspace</a></main>;
  }
}
