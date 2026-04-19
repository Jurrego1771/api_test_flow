#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const reportDir = process.argv[2] || "allure-report";
const rootDir = process.cwd();
const resolvedDir = path.resolve(rootDir, reportDir);
const cssSource = path.resolve(__dirname, "allure-brand.css");
const cssTarget = path.join(resolvedDir, "allure-brand.css");
const indexPath = path.join(resolvedDir, "index.html");

if (!fs.existsSync(resolvedDir)) {
  console.error(`Report directory not found: ${resolvedDir}`);
  process.exit(1);
}

if (!fs.existsSync(indexPath)) {
  console.error(`index.html not found in ${resolvedDir}`);
  process.exit(1);
}

const css = fs.readFileSync(cssSource, "utf8");
fs.writeFileSync(cssTarget, css, "utf8");

let html = fs.readFileSync(indexPath, "utf8");
const brandLink = '<link rel="stylesheet" type="text/css" href="allure-brand.css">';
const themeMeta = '<meta name="theme-color" content="#0b0d12">';
const brandTitle = "<title>Allure Report | Neon Noir</title>";

if (!html.includes(brandLink) || !html.includes(themeMeta)) {
  if (/<\/head>/i.test(html)) {
    html = html.replace(
      /<\/head>/i,
      [
        !html.includes(brandLink) ? `    ${brandLink}` : null,
        !html.includes(themeMeta) ? `    ${themeMeta}` : null,
        "</head>",
      ].filter(Boolean).join("\n")
    );
  } else if (/<body[^>]*>/i.test(html)) {
    const headBlock = [
      "<head>",
      !html.includes(brandLink) ? `    ${brandLink}` : null,
      !html.includes(themeMeta) ? `    ${themeMeta}` : null,
      "</head>",
    ].filter(Boolean).join("\n");

    if (/<html[^>]*>/i.test(html)) {
      html = html.replace(/<html([^>]*)>/i, (match, attrs) => `<html${attrs}>${headBlock}`);
    } else {
      html = `${headBlock}\n${html}`;
    }
  } else {
    html = [
      "<!DOCTYPE html>",
      "<html>",
      "<head>",
      !html.includes(brandLink) ? `    ${brandLink}` : null,
      !html.includes(themeMeta) ? `    ${themeMeta}` : null,
      "</head>",
      html,
      "</html>",
    ].filter(Boolean).join("\n");
  }
}

if (/<title>.*?<\/title>/i.test(html)) {
  html = html.replace(/<title>.*?<\/title>/i, brandTitle);
} else if (/<head[^>]*>/i.test(html)) {
  html = html.replace(/<head([^>]*)>/i, `<head$1>\n    ${brandTitle}`);
} else {
  html = `${brandTitle}\n${html}`;
}

fs.writeFileSync(indexPath, html, "utf8");

console.log(`Branded Allure report: ${path.relative(rootDir, resolvedDir)}`);
