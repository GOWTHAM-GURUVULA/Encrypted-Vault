const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");

const requiredFiles = [
  {
    label: "Packaged backend executable",
    path: path.resolve(projectRoot, "..", "..", "backend", "dist", "app.exe"),
  },
  {
    label: "Electron app icon",
    path: path.resolve(projectRoot, "electron", "vault.ico"),
  },
];

const missing = requiredFiles.filter((item) => !fs.existsSync(item.path));

if (missing.length > 0) {
  console.error("Release build blocked. Missing required files:");
  for (const item of missing) {
    console.error(`- ${item.label}: ${item.path}`);
  }
  process.exit(1);
}

console.log("Release build inputs verified.");
