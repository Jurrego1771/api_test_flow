#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const reportDir = process.argv[2] || "allure-report";
const resolvedDir = path.resolve(process.cwd(), reportDir);
const indexPath = path.join(resolvedDir, "index.html");
const cssTarget = path.join(resolvedDir, "allure-brand.css");

console.log("RESTRICTED MODE: Removing custom branding...");

if (fs.existsSync(cssTarget)) {
  fs.unlinkSync(cssTarget);
}

if (fs.existsSync(indexPath)) {
  let html = fs.readFileSync(indexPath, "utf8");
  // Removemos las líneas inyectadas usando strings literales para evitar errores de Regex
  const brandLink = '<link rel="stylesheet" type="text/css" href="allure-brand.css">';
  const themeMeta = '<meta name="theme-color" content="#0b0d12">';
  const brandTitle = '<title>Allure Report | Neon Noir</title>';
  
  html = html.split(brandLink).join("");
  html = html.split(themeMeta).join("");
  html = html.split(brandTitle).join("<title>Allure Report</title>");
  
  fs.writeFileSync(indexPath, html, "utf8");
}

console.log(`Cleaned Allure report at: ${reportDir}`);
