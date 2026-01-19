import { join } from "path";
import { loadCV, renderToHTML, buildCV } from "./renderer";

const OUTPUT_DIR = join(process.cwd(), "output");
const PORT = parseInt(process.env.PORT || "3000");
const HOST = process.env.HOST || "localhost";
const NODE_ENV = process.env.NODE_ENV || "development";
const IS_PRODUCTION = NODE_ENV === "production";

// Clean output directories on startup in development only
if (!IS_PRODUCTION) {
  console.log("🧹 Cleaning output directories...");
  await Bun.$`rm -rf ${OUTPUT_DIR}/html/* ${OUTPUT_DIR}/pdf/* 2>/dev/null || true`.quiet();
  console.log("✅ Output directories cleaned");
}

Bun.serve({
  port: PORT,
  hostname: HOST,
  async fetch(req) {
    const url = new URL(req.url);
    const pathname = url.pathname;

    try {
      // Serve static font files
      if (pathname.startsWith("/fonts/")) {
        const fontPath = join(process.cwd(), "public", pathname);
        const fontFile = Bun.file(fontPath);

        if (await fontFile.exists()) {
          return new Response(fontFile, {
            headers: {
              "Content-Type": "font/otf",
              "Cache-Control": "public, max-age=31536000", // Cache for 1 year
            },
          });
        }
        return new Response("Font not found", { status: 404 });
      }

      // Ignore favicon
      if (pathname === "/favicon.ico") {
        return new Response("Not Found", { status: 404 });
      }

      // Root: Show current.json as HTML
      if (pathname === "/") {
        const cv = await loadCV("current");
        const html = await renderToHTML(cv);
        return new Response(html, {
          headers: { "Content-Type": "text/html" },
        });
      }

      // JSON of current.json
      if (pathname === "/json") {
        const cv = await loadCV("current");
        return Response.json(cv);
      }

      // PDF of current.json
      if (pathname === "/pdf") {
        const pdfPath = join(OUTPUT_DIR, "pdf", "current.pdf");
        const pdfFile = Bun.file(pdfPath);

        // Generate if doesn't exist
        if (!(await pdfFile.exists())) {
          console.log("Generating PDF for current...");
          const result = await buildCV("current", "pdf");
          if (!result.success || !result.pdfPath) {
            throw new Error(result.error || "Failed to generate PDF");
          }
        }

        return new Response(Bun.file(pdfPath), {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": 'inline; filename="current.pdf"',
          },
        });
      }

      // Check for variant JSON route: /:variant/json
      if (pathname.endsWith("/json")) {
        const variant = pathname.slice(1, -5); // Remove leading '/' and trailing '/json'
        const cv = await loadCV(variant);
        return Response.json(cv);
      }

      // Check for variant PDF route: /:variant/pdf
      if (pathname.endsWith("/pdf")) {
        const variant = pathname.slice(1, -4); // Remove leading '/' and trailing '/pdf'
        const pdfPath = join(OUTPUT_DIR, "pdf", `${variant}.pdf`);
        const pdfFile = Bun.file(pdfPath);

        // Generate if doesn't exist
        if (!(await pdfFile.exists())) {
          console.log(`Generating PDF for ${variant}...`);
          const result = await buildCV(variant, "pdf");
          if (!result.success || !result.pdfPath) {
            throw new Error(result.error || "Failed to generate PDF");
          }
        }

        return new Response(Bun.file(pdfPath), {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename="${variant.replace(/\//g, "-")}.pdf"`,
          },
        });
      }

      // Variant HTML route: /:variant
      const variant = pathname.slice(1); // Remove leading '/'
      const cv = await loadCV(variant);
      const html = await renderToHTML(cv);
      return new Response(html, {
        headers: { "Content-Type": "text/html" },
      });

    } catch (error) {
      console.error("Error:", error);
      return new Response(
        `<html><body><h1>Error</h1><p>${
          error instanceof Error ? error.message : String(error)
        }</p></body></html>`,
        {
          status: 404,
          headers: { "Content-Type": "text/html" },
        }
      );
    }
  },

  ...(IS_PRODUCTION ? {} : {
    development: {
      hmr: true,
      console: true,
    },
  }),
});

const baseURL = process.env.BASE_URL || `http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}`;
console.log(`🚀 CV Rendering Server running on ${HOST}:${PORT} [${NODE_ENV}]`);
console.log(`📝 Current CV: ${baseURL}`);
console.log(`📄 Current PDF: ${baseURL}/pdf`);
console.log(`📋 Current JSON: ${baseURL}/json`);
if (!IS_PRODUCTION) {
  console.log(`📝 Variant example: ${baseURL}/variants/tech-focused`);
  console.log(`📄 Variant PDF example: ${baseURL}/variants/tech-focused/pdf`);
  console.log(`📋 Variant JSON example: ${baseURL}/variants/tech-focused/json`);
}
