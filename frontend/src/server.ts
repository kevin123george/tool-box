import { serve } from "bun";

const BACKEND = "http://localhost:9099";

serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);

    // Proxy API calls
    if (url.pathname.startsWith("/api/")) {
      return fetch(BACKEND + url.pathname + url.search, {
        method: req.method,
        headers: req.headers,
        body: req.body
      });
    }

    // Serve index
    if (url.pathname === "/") {
      return new Response(Bun.file("public/index.html"));
    }

    // Static files
    const file = Bun.file("public" + url.pathname);
    if (await file.exists()) {
      return new Response(file);
    }

    return new Response("Not Found", { status: 404 });
  }
});

console.log("✅ Frontend running at http://localhost:3000");
