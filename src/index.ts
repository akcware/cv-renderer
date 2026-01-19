import { join } from "path";
import viewer from "./viewer.html";
import { loadCV, listCVs, renderToHTML, buildCV } from "./renderer";

const OUTPUT_DIR = join(process.cwd(), "output");
const PORT = process.env.PORT || 3000;

Bun.serve({
  port: PORT,
  routes: {
    // Main viewer interface
    "/": viewer,

    // API: List all CVs
    "/api/cvs": {
      GET: async (req) => {
        try {
          const cvs = await listCVs();
          return Response.json(cvs);
        } catch (error) {
          return Response.json(
            { error: error instanceof Error ? error.message : String(error) },
            { status: 500 }
          );
        }
      },
    },

    // API: Get CV data
    "/api/cv/:name": {
      GET: async (req) => {
        try {
          const name = req.params.name;
          const cv = await loadCV(name);
          return Response.json(cv);
        } catch (error) {
          return Response.json(
            { error: error instanceof Error ? error.message : String(error) },
            { status: 404 }
          );
        }
      },
    },

    // Render CV as HTML
    "/render/:name": {
      GET: async (req) => {
        try {
          const name = req.params.name;
          const cv = await loadCV(name);
          const html = await renderToHTML(cv);

          return new Response(html, {
            headers: {
              "Content-Type": "text/html",
            },
          });
        } catch (error) {
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
    },

    // Serve or generate PDF
    "/pdf/:name": {
      GET: async (req) => {
        try {
          const name = req.params.name;
          const pdfPath = join(OUTPUT_DIR, "pdf", `${name}.pdf`);
          const pdfFile = Bun.file(pdfPath);

          // Check if PDF exists
          if (await pdfFile.exists()) {
            return new Response(pdfFile, {
              headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `inline; filename="${name}.pdf"`,
              },
            });
          }

          // Generate PDF on-demand if it doesn't exist
          console.log(`Generating PDF for ${name}...`);
          const result = await buildCV(name, "pdf");

          if (!result.success || !result.pdfPath) {
            throw new Error(result.error || "Failed to generate PDF");
          }

          const generatedPdf = Bun.file(result.pdfPath);
          return new Response(generatedPdf, {
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": `inline; filename="${name}.pdf"`,
            },
          });
        } catch (error) {
          return Response.json(
            { error: error instanceof Error ? error.message : String(error) },
            { status: 500 }
          );
        }
      },
    },

    // Download HTML
    "/download/html/:name": {
      GET: async (req) => {
        try {
          const name = req.params.name;
          const htmlPath = join(OUTPUT_DIR, "html", `${name}.html`);
          const htmlFile = Bun.file(htmlPath);

          // Generate if doesn't exist
          if (!(await htmlFile.exists())) {
            const result = await buildCV(name, "html");
            if (!result.success || !result.htmlPath) {
              throw new Error(result.error || "Failed to generate HTML");
            }
          }

          const file = Bun.file(htmlPath);
          return new Response(file, {
            headers: {
              "Content-Type": "text/html",
              "Content-Disposition": `attachment; filename="${name}.html"`,
            },
          });
        } catch (error) {
          return Response.json(
            { error: error instanceof Error ? error.message : String(error) },
            { status: 500 }
          );
        }
      },
    },

    // Download PDF
    "/download/pdf/:name": {
      GET: async (req) => {
        try {
          const name = req.params.name;
          const pdfPath = join(OUTPUT_DIR, "pdf", `${name}.pdf`);
          const pdfFile = Bun.file(pdfPath);

          // Generate if doesn't exist
          if (!(await pdfFile.exists())) {
            const result = await buildCV(name, "pdf");
            if (!result.success || !result.pdfPath) {
              throw new Error(result.error || "Failed to generate PDF");
            }
          }

          const file = Bun.file(pdfPath);
          return new Response(file, {
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": `attachment; filename="${name}.pdf"`,
            },
          });
        } catch (error) {
          return Response.json(
            { error: error instanceof Error ? error.message : String(error) },
            { status: 500 }
          );
        }
      },
    },
  },

  development: {
    hmr: true,
    console: true,
  },
});

console.log(`🚀 CV Rendering Server running at http://localhost:${PORT}`);
console.log(`📝 Viewer: http://localhost:${PORT}`);
console.log(`📋 List CVs: http://localhost:${PORT}/api/cvs`);
