#!/usr/bin/env node

const shell = require("shelljs");
const fs = require("fs");
const path = require("path");

function isShopifyProject() {
  return fs.existsSync(path.join("layout", "theme.liquid"));
}

function addTailwindToThemeLiquid() {
  const themeLiquidPath = "layout/theme.liquid";
  if (fs.existsSync(themeLiquidPath)) {
    let themeLiquid = fs.readFileSync(themeLiquidPath, "utf8");

    // Check if the <link> to tailwind.css already exists
    if (
      !themeLiquid.includes("{{ 'tailwind.css' | asset_url | stylesheet_tag }}")
    ) {
      // Find the <head> section and add the stylesheet link inside it
      const headEndIndex = themeLiquid.indexOf("</head>");
      const linkTag = `
  "{{ 'tailwind.css' | asset_url | stylesheet_tag }}"
      `;
      themeLiquid =
        themeLiquid.slice(0, headEndIndex) +
        linkTag +
        themeLiquid.slice(headEndIndex);
      fs.writeFileSync(themeLiquidPath, themeLiquid);
      shell.echo("✅ Added Tailwind CSS link reference to 'theme.liquid'.");
    } else {
      shell.echo("ℹ️ Tailwind CSS link already exists in 'theme.liquid'.");
    }
  } else {
    shell.echo("❌ 'layout/theme.liquid' not found.");
  }
}

function installTailwindCSS() {
  if (!shell.which("node")) {
    shell.echo("❌ Node.js is not installed. Please install Node.js first.");
    shell.exit(1);
  }

  // Check if it's a Shopify project
  if (!isShopifyProject()) {
    shell.echo(
      "❌ This doesn't appear to be a Shopify project. Ensure 'layout/theme.liquid' exists."
    );
    shell.exit(1);
  }

  // Initialise npm if package.json doesn't exist
  if (!fs.existsSync("package.json")) {
    shell.echo("📦 Initialising npm...");
    if (shell.exec("npm init -y").code !== 0) {
      shell.echo("❌ Failed to initialise npm.");
      shell.exit(1);
    }
  }

  // Install Tailwind CSS and dependencies
  shell.echo("⬇️ Installing Tailwind CSS and its dependencies...");
  if (
    shell.exec("npm install -D tailwindcss postcss autoprefixer").code !== 0
  ) {
    shell.echo("❌ Failed to install Tailwind CSS.");
    shell.exit(1);
  }

  // Generate Tailwind config file
  shell.echo("⚙️ Generating custom Tailwind config file...");
  const configFilePath = "tailwind.config.js";
  const customConfig = `
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "*.html",
    "./layout/*.liquid",
    "./sections/*.liquid",
    "./snippets/*.liquid",
    "./assets/*.js",
    "./tailwind-config.css",
  ],
  theme: {
    screens: {
      sm: "550px",
      md: "750px",
      lg: "990px",
    },
  },
  corePlugins: {
    preflight: false,
  },
  prefix: "tw-",
};
  `;
  fs.writeFileSync(configFilePath, customConfig);
  shell.echo("✅ Custom 'tailwind.config.js' has been created.");

  // Create 'tailwind-config.css' in the main folder
  const stylesPath = "tailwind-config.css";
  if (!fs.existsSync(stylesPath)) {
    fs.writeFileSync(
      stylesPath,
      `
@tailwind base;
@tailwind components;
@tailwind utilities;
    `
    );
    shell.echo(`✅ Created '${stylesPath}' in the main folder.`);
  } else {
    shell.echo(`ℹ️ '${stylesPath}' already exists. Skipping creation.`);
  }

  // Add build script to package.json if not present
  const packageJsonPath = "package.json";
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  if (!packageJson.scripts || !packageJson.scripts.tailwind) {
    packageJson.scripts = packageJson.scripts || {};
    packageJson.scripts.tailwind =
      "npx tailwindcss -i ./tailwind-config.css -o ./assets/tailwind.css --watch";
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    shell.echo("✅ Added 'build' script to 'package.json'.");
  } else {
    shell.echo("ℹ️ 'build' script already exists in 'package.json'.");
  }

  // Add stylesheet link to 'theme.liquid'
  addTailwindToThemeLiquid();

  shell.echo("🎉 Tailwind CSS has been installed and configured successfully!");
  shell.echo("👉 To build your CSS, run: npm run tailwind");
  shell.echo(
    "👉 Include 'assets/tailwind.css' in your Shopify 'theme.liquid' file."
  );
}

// Run the installation function
installTailwindCSS();
