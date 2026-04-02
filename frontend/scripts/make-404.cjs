const fs = require("fs");
const path = require("path");

const distDir = path.resolve(__dirname, "..", "dist");
const indexPath = path.join(distDir, "index.html");
const fallbackPath = path.join(distDir, "404.html");

try {
  if (!fs.existsSync(distDir)) {
    console.error("dist directory not found, skipping 404 copy.");
    process.exit(0);
  }

  if (!fs.existsSync(indexPath)) {
    console.error("index.html not found in dist, skipping 404 copy.");
    process.exit(0);
  }

  fs.copyFileSync(indexPath, fallbackPath);
  console.log("Created SPA fallback: dist/404.html");
} catch (err) {
  console.error("Failed to create 404 fallback:", err);
  process.exit(1);
}
