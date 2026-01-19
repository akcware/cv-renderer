import { join } from "path";
import { loadCV, renderToHTML, buildCV } from "./renderer";

const OUTPUT_DIR = join(process.cwd(), "output");
const PORT = process.env.PORT || 3000;

// Clean output directories on startup to ensure fresh builds
console.log("🧹 Cleaning output directories...");
await Bun.$`rm -rf ${OUTPUT_DIR}/html/* ${OUTPUT_DIR}/pdf/* 2>/dev/null || true`.quiet();
console.log("✅ Output directories cleaned");

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const pathname = url.pathname;

    try {
      // Ignore font requests and other static assets
      if (pathname.startsWith("/fonts/") || pathname === "/favicon.ico") {
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

  development: {
    hmr: true,
    console: true,
  },
});

console.log(`🚀 CV Rendering Server running at http://localhost:${PORT}`);
console.log(`📝 Current CV: http://localhost:${PORT}`);
console.log(`📄 Current PDF: http://localhost:${PORT}/pdf`);
console.log(`📋 Current JSON: http://localhost:${PORT}/json`);
console.log(`📝 Variant example: http://localhost:${PORT}/variants/tech-focused`);
console.log(`📄 Variant PDF example: http://localhost:${PORT}/variants/tech-focused/pdf`);
console.log(`📋 Variant JSON example: http://localhost:${PORT}/variants/tech-focused/json`);
