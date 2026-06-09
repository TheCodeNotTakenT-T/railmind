import fs from "fs";
import path from "path";

const IGNORED_DIRS = new Set([
  ".git",
  "node_modules",
  ".next",
  "out",
  "build",
  "coverage",
]);

const IGNORED_FILES = new Set([
  "package-lock.json",
  "codebase.md",
  ".DS_Store",
]);

const ALLOWED_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".css",
  ".mjs",
  ".md",
  ".html",
]);

const rootDir = process.cwd();
const outputFile = path.join(rootDir, "codebase.md");

function walk(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    // Get path relative to the root directory
    const relativePath = path.relative(rootDir, filePath);
    const fileName = path.basename(filePath);

    if (stat.isDirectory()) {
      if (!IGNORED_DIRS.has(fileName) && !relativePath.startsWith(".next") && !relativePath.startsWith("node_modules")) {
        walk(filePath, fileList);
      }
    } else {
      const ext = path.extname(fileName);
      if (!IGNORED_FILES.has(fileName) && ALLOWED_EXTENSIONS.has(ext)) {
        fileList.push(relativePath);
      }
    }
  }
  return fileList;
}

function generateCodebaseMd() {
  console.log("Generating codebase.md...");
  const files = walk(rootDir);
  let output = `# RailMind Codebase\n\nGenerated on: ${new Date().toISOString()}\n\n`;

  // Sort files for consistent ordering in markdown
  files.sort();

  for (const relPath of files) {
    const fullPath = path.join(rootDir, relPath);
    console.log(`Processing: ${relPath}`);
    const content = fs.readFileSync(fullPath, "utf8");
    
    const ext = path.extname(relPath).slice(1);
    let lang = ext;
    if (ext === "tsx" || ext === "ts") lang = "typescript";
    else if (ext === "jsx" || ext === "js" || ext === "mjs") lang = "javascript";
    else if (ext === "css") lang = "css";
    else if (ext === "json") lang = "json";
    else if (ext === "md") lang = "markdown";
    
    // Normalize slashes to forward slashes for cross-platform links
    const normalizedRelPath = relPath.replace(/\\/g, "/");

    output += `## File: \`${normalizedRelPath}\`\n\n`;
    output += `\`\`\`${lang}\n${content}\n\`\`\`\n\n`;
  }

  fs.writeFileSync(outputFile, output, "utf8");
  console.log("✅ Generated codebase.md successfully!");
}

generateCodebaseMd();
