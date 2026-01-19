#!/usr/bin/env bun
import mri from "mri";
import { join } from "path";
import { buildCV, buildAllCVs, listCVs, loadCV } from "./renderer";

const DATA_DIR = join(process.cwd(), "data");

const HELP_TEXT = `
CV Rendering CLI

Usage:
  bun run cli.ts <command> [options]

Commands:
  build <name>        Build a specific CV (generates HTML + PDF)
                      Examples:
                        bun run cli.ts build current
                        bun run cli.ts build variants/tech-focused

  build:all           Build all CVs in the data directory

  list                List all available CVs

  new <name>          Create a new CV variant from current.json
                      Examples:
                        bun run cli.ts new variants/management
                        bun run cli.ts new test

Options:
  --format <format>   Output format: html, pdf, or both (default: both)
  --help, -h          Show this help message

Examples:
  bun run cli.ts list
  bun run cli.ts build current
  bun run cli.ts build current --format html
  bun run cli.ts build:all
  bun run cli.ts new variants/tech-focused
`;

async function main() {
  const argv = mri(process.argv.slice(2), {
    alias: {
      h: "help",
      f: "format",
    },
    default: {
      format: "both",
    },
  });

  const command = argv._[0];
  const args = argv._.slice(1);

  if (argv.help || !command) {
    console.log(HELP_TEXT);
    process.exit(0);
  }

  try {
    switch (command) {
      case "build": {
        const name = args[0];
        if (!name) {
          console.error("Error: CV name is required");
          console.log("\nUsage: bun run cli.ts build <name>");
          process.exit(1);
        }

        const format = argv.format as 'html' | 'pdf' | 'both';
        if (!['html', 'pdf', 'both'].includes(format)) {
          console.error("Error: Invalid format. Must be html, pdf, or both");
          process.exit(1);
        }

        console.log(`Building ${name}...`);
        const result = await buildCV(name, format);

        if (result.success) {
          console.log(`✓ ${name} built successfully`);
          if (result.htmlPath) {
            console.log(`  HTML: ${result.htmlPath}`);
          }
          if (result.pdfPath) {
            console.log(`  PDF:  ${result.pdfPath}`);
          }
        } else {
          console.error(`✗ Failed to build ${name}: ${result.error}`);
          process.exit(1);
        }
        break;
      }

      case "build:all": {
        const format = argv.format as 'html' | 'pdf' | 'both';
        if (!['html', 'pdf', 'both'].includes(format)) {
          console.error("Error: Invalid format. Must be html, pdf, or both");
          process.exit(1);
        }

        console.log("Building all CVs...\n");
        const results = await buildAllCVs(format);

        const successful = results.filter((r) => r.success).length;
        const failed = results.filter((r) => !r.success).length;

        console.log(`\nSummary: ${successful} succeeded, ${failed} failed`);

        if (failed > 0) {
          process.exit(1);
        }
        break;
      }

      case "list": {
        const cvs = await listCVs();

        if (cvs.length === 0) {
          console.log("No CVs found in data/");
        } else {
          console.log(`Found ${cvs.length} CV(s):\n`);
          for (const cv of cvs) {
            console.log(`  ${cv.name}`);
          }
        }
        break;
      }

      case "new": {
        const name = args[0];
        if (!name) {
          console.error("Error: CV name is required");
          console.log("\nUsage: bun run cli.ts new <name>");
          process.exit(1);
        }

        // Load current.json as template
        const templatePath = join(DATA_DIR, "current.json");
        const templateFile = Bun.file(templatePath);

        if (!(await templateFile.exists())) {
          console.error("Error: Template file (data/current.json) not found");
          process.exit(1);
        }

        const template = await loadCV("current");

        // Create new CV file
        const newPath = join(DATA_DIR, `${name}.json`);
        const newFile = Bun.file(newPath);

        if (await newFile.exists()) {
          console.error(`Error: CV already exists: ${name}`);
          process.exit(1);
        }

        // Update meta information if present
        if (template.meta) {
          template.meta.lastModified = new Date().toISOString();
        }

        await Bun.write(newPath, JSON.stringify(template, null, 2));
        console.log(`✓ Created new CV: ${name}`);
        console.log(`  Path: ${newPath}`);
        console.log(`\nYou can now edit this file and build it with:`);
        console.log(`  bun run cli.ts build ${name}`);
        break;
      }

      default:
        console.error(`Error: Unknown command: ${command}`);
        console.log("\nRun 'bun run cli.ts --help' for usage information");
        process.exit(1);
    }
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
