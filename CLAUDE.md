# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a CV rendering system that generates professional HTML and PDF resumes from JSON Resume format. It includes:
- CLI tools for batch CV generation
- Web viewer with React frontend
- Multi-format export (HTML/PDF)
- Support for CV variants
- Git-based version history

## Common Commands

### Development
```bash
bun run dev              # Start web server with HMR on port 3000
```

### Building CVs
```bash
bun run build current                    # Build current.json
bun run build variants/tech-focused      # Build a variant
bun run build current --format html      # Build HTML only
bun run build current --format pdf       # Build PDF only
bun run build:all                        # Build all CVs
```

### CV Management
```bash
bun run list                    # List all available CVs
bun run new variants/name       # Create new CV from current.json template
```

### Direct CLI Access
```bash
bun src/cli.ts <command> [options]
```

## Architecture

### Core Components

**Renderer (`src/renderer.ts`)**
- Core engine for CV operations
- `loadCV()` - Loads JSON data from `data/` directory
- `listCVs()` - Scans `data/` for all `.json` files
- `renderToHTML()` - Uses Professional theme to render HTML
- `renderToPDF()` - Uses Puppeteer to generate PDFs from HTML
- `buildCV()` - Main build function (HTML + PDF)
- `buildAllCVs()` - Batch processing all CVs

**Web Server (`src/index.ts`)**
- Bun.serve() with simple routing
- Routes:
  - `/` - Current CV as HTML
  - `/pdf` - Current CV as PDF (generates on-demand if missing)
  - `/json` - Current CV as JSON
  - `/:variant` - Variant CV as HTML (e.g., `/variants/tech-focused`)
  - `/:variant/pdf` - Variant CV as PDF (e.g., `/variants/tech-focused/pdf`)
  - `/:variant/json` - Variant CV as JSON (e.g., `/variants/tech-focused/json`)

**CLI (`src/cli.ts`)**
- Commands: `build`, `build:all`, `list`, `new`
- Uses `mri` for argument parsing
- Handles format flags (`--format html|pdf|both`)

**Web Output**
- Clean, direct rendering of CVs
- No UI chrome or navigation elements
- Just the CV content itself

### Data Flow

**Build Process:**
1. Load JSON from `data/*.json`
2. Render using Professional theme
3. Save HTML to `output/html/`
4. Generate PDF via Puppeteer → `output/pdf/`

**Web Server:**
1. Route request based on URL pattern
2. Load CV data from `data/` directory
3. Render HTML using Professional theme or serve PDF
4. Generate PDF on-demand if doesn't exist

### Directory Structure

```
data/           # CV source files (git tracked)
  current.json  # Primary CV
  variants/     # CV variations
output/         # Generated files (git ignored)
  html/
  pdf/
src/
  renderer.ts   # Core engine
  index.ts      # Web server
  cli.ts        # CLI commands
  types.ts      # TypeScript types
```

### Key Patterns

**CV Naming:**
- CV files: `data/*.json` or `data/variants/*.json`
- Reference by name without extension: `current` or `variants/tech-focused`
- Output mirrors structure: `output/html/variants/tech-focused.html`

**On-Demand Generation:**
- Web routes check if output exists
- If missing, calls `buildCV()` automatically
- CLI always regenerates (no caching)

**JSON Resume Schema:**
- Standard format with `basics`, `work`, `education`, `skills`, `projects`
- See `src/types.ts` for TypeScript definitions
- Theme: Professional (`@jsonresume/jsonresume-theme-professional`)

## Bun-Specific Instructions

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads .env, so don't use dotenv.

### Bun APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

### Testing

Use `bun test` to run tests.

```ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

### Frontend with Bun

Use HTML imports with `Bun.serve()`. Don't use `vite`. HTML imports fully support React, CSS, Tailwind.

Server:

```ts
import index from "./index.html"

Bun.serve({
  routes: {
    "/": index,
    "/api/users/:id": {
      GET: (req) => {
        return new Response(JSON.stringify({ id: req.params.id }));
      },
    },
  },
  development: {
    hmr: true,
    console: true,
  }
})
```

HTML files can import .tsx, .jsx or .js files directly and Bun's bundler will transpile & bundle automatically.

```html
<html>
  <body>
    <script type="module" src="./frontend.tsx"></script>
  </body>
</html>
```

Then run with:

```sh
bun --hot ./index.ts
```
