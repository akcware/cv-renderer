import { Glob } from "bun";
import { resolve, join, dirname, basename } from "path";
import type { CVData, CVMetadata, BuildResult } from "./types";

const DATA_DIR = resolve(process.cwd(), "data");
const OUTPUT_DIR = resolve(process.cwd(), "output");
const FONTS_DIR = resolve(process.cwd(), "assets/fonts");

/**
 * Inline the theme's web fonts as base64 data URIs.
 *
 * The Professional theme references Latin Modern fonts via absolute paths
 * (e.g. `/fonts/lmroman10-regular.otf`) that resolve nowhere during static
 * HTML output or Puppeteer's `setContent` (no origin / base URL), so the text
 * silently falls back to Courier New. Embedding the actual font bytes makes
 * rendering self-contained and identical across HTML and PDF.
 */
async function embedFonts(html: string): Promise<string> {
  const referenced = new Set(
    [...html.matchAll(/\/fonts\/([a-zA-Z0-9._-]+\.otf)/g)].map((m) => m[1]),
  );

  for (const file of referenced) {
    const fontFile = Bun.file(join(FONTS_DIR, file));
    if (!(await fontFile.exists())) {
      console.warn(`⚠ Font missing, will fall back: ${file}`);
      continue;
    }
    const base64 = Buffer.from(await fontFile.arrayBuffer()).toString("base64");
    html = html.replaceAll(`/fonts/${file}`, `data:font/otf;base64,${base64}`);
  }

  return html;
}

/**
 * Load a CV from the data directory
 * @param name - CV name (e.g., "current" or "variants/tech-focused")
 * @returns CV data
 */
export async function loadCV(name: string): Promise<CVData> {
  const cvPath = join(DATA_DIR, `${name}.json`);
  const cvFile = Bun.file(cvPath);

  if (!(await cvFile.exists())) {
    throw new Error(`CV not found: ${name}`);
  }

  const cvData = await cvFile.json();
  return cvData as CVData;
}

/**
 * List all available CVs in the data directory
 * @returns Array of CV metadata
 */
export async function listCVs(): Promise<CVMetadata[]> {
  const cvs: CVMetadata[] = [];
  const glob = new Glob("**/*.json");

  for await (const file of glob.scan(DATA_DIR)) {
    // Remove .json extension and normalize path
    const name = file.replace(/\.json$/, "");
    const displayName = basename(name);

    cvs.push({
      name,
      path: file,
      fullPath: join(DATA_DIR, file),
      displayName,
    });
  }

  return cvs.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Render CV to HTML using Professional theme
 * @param cv - CV data
 * @returns HTML string
 */
export async function renderToHTML(cv: CVData): Promise<string> {
  // Dynamic import to avoid loading theme until needed
  const { render } = await import("@jsonresume/jsonresume-theme-professional");

  const html = await render(cv);
  return await embedFonts(html);
}

/**
 * Render CV to PDF using Puppeteer
 * @param html - HTML content
 * @param outputPath - Path to save PDF
 */
export async function renderToPDF(html: string, outputPath: string): Promise<void> {
  const puppeteer = await import("puppeteer");

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Ensure output directory exists using Bun's shell
    const dir = dirname(outputPath);
    await Bun.$`mkdir -p ${dir}`;

    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm',
      },
    });
  } finally {
    await browser.close();
  }
}

/**
 * Build a CV (generate HTML and PDF)
 * @param name - CV name (e.g., "current" or "variants/tech-focused")
 * @param format - Output format ('html', 'pdf', or 'both')
 * @returns Build result
 */
export async function buildCV(
  name: string,
  format: 'html' | 'pdf' | 'both' = 'both'
): Promise<BuildResult> {
  try {
    // Load CV data
    const cv = await loadCV(name);

    // Render to HTML
    const html = await renderToHTML(cv);

    // Save HTML if requested
    let htmlPath: string | undefined;
    if (format === 'html' || format === 'both') {
      htmlPath = join(OUTPUT_DIR, 'html', `${name}.html`);
      // Ensure output directory exists using Bun's shell
      const dir = dirname(htmlPath);
      await Bun.$`mkdir -p ${dir}`;
      await Bun.write(htmlPath, html);
    }

    // Save PDF if requested
    let pdfPath: string | undefined;
    if (format === 'pdf' || format === 'both') {
      pdfPath = join(OUTPUT_DIR, 'pdf', `${name}.pdf`);
      await renderToPDF(html, pdfPath);
    }

    return {
      success: true,
      cvName: name,
      htmlPath,
      pdfPath,
    };
  } catch (error) {
    return {
      success: false,
      cvName: name,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Build all CVs in the data directory
 * @param format - Output format ('html', 'pdf', or 'both')
 * @returns Array of build results
 */
export async function buildAllCVs(
  format: 'html' | 'pdf' | 'both' = 'both'
): Promise<BuildResult[]> {
  const cvs = await listCVs();
  const results: BuildResult[] = [];

  for (const cv of cvs) {
    console.log(`Building ${cv.name}...`);
    const result = await buildCV(cv.name, format);
    results.push(result);

    if (result.success) {
      console.log(`✓ ${cv.name} built successfully`);
    } else {
      console.error(`✗ ${cv.name} failed: ${result.error}`);
    }
  }

  return results;
}
