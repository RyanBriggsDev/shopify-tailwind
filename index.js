#!/usr/bin/env node

const shell = require("shelljs");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function isShopifyProject() {
  return fs.existsSync(path.join("layout", "theme.liquid"));
}

function promptForVersion() {
  return new Promise((resolve) => {
    rl.question(
      "Which version of Tailwind CSS would you like to install? (3/4): ",
      (answer) => {
        const version = answer.trim();
        if (version === "3" || version === "4") {
          resolve(version);
        } else {
          console.log("❌ Invalid version. Please enter either 3 or 4.");
          promptForVersion().then(resolve);
        }
      }
    );
  });
}

function addTailwindToThemeLiquid(version = "3") {
  const themeLiquidPath = "layout/theme.liquid";
  if (fs.existsSync(themeLiquidPath)) {
    let themeLiquid = fs.readFileSync(themeLiquidPath, "utf8");

    // Check if the <link> to tailwind.css already exists
    const cssFile = version === "3" ? "tailwind.css" : "tailwind-output.css";
    const linkTag = `{{ '${cssFile}' | asset_url | stylesheet_tag }}`;
    
    if (!themeLiquid.includes(linkTag)) {
      // Find the <head> section and add the stylesheet link inside it
      const headEndIndex = themeLiquid.indexOf("</head>");
      themeLiquid =
        themeLiquid.slice(0, headEndIndex) +
        linkTag +
        themeLiquid.slice(headEndIndex);
      fs.writeFileSync(themeLiquidPath, themeLiquid);
      shell.echo(`✅ Added Tailwind CSS v${version} link reference to 'theme.liquid'.`);
    } else {
      shell.echo(`ℹ️ Tailwind CSS v${version} link already exists in 'theme.liquid'.`);
    }
  } else {
    shell.echo("❌ 'layout/theme.liquid' not found.");
  }
}

function createGitIgnore() {
  const gitIgnorePath = ".gitignore";
  if (!fs.existsSync(gitIgnorePath)) {
    shell.echo("📄 Creating '.gitignore' file...");
    fs.writeFileSync(
      gitIgnorePath,
      `
.DS_Store
node_modules
package-lock.json
.env
/.idea
      `
    );
    shell.echo("✅ '.gitignore' has been created.");
  } else {
    shell.echo("ℹ️ '.gitignore' already exists. Ensuring correct content.");
  }

  const gitIgnoreContent = fs.readFileSync(gitIgnorePath, "utf8");
  if (
    !gitIgnoreContent.includes(".DS_Store") ||
    !gitIgnoreContent.includes("node_modules") ||
    !gitIgnoreContent.includes("package-lock.json") ||
    !gitIgnoreContent.includes(".env") ||
    !gitIgnoreContent.includes("/.idea")
  ) {
    shell.echo("📄 Updating '.gitignore'...");
    fs.appendFileSync(
      gitIgnorePath,
      `
.DS_Store
node_modules
package-lock.json
.env
/.idea
      `
    );
    shell.echo("✅ '.gitignore' has been updated.");
  }
}

function createShopifyIgnore() {
  const shopifyIgnorePath = ".shopifyignore";
  if (!fs.existsSync(shopifyIgnorePath)) {
    shell.echo("📄 Creating '.shopifyignore' file...");
    fs.writeFileSync(
      shopifyIgnorePath,
      `
package.json
package-lock.json
tailwind.config.js
tailwind-config.css
html-ref.html
      `
    );
    shell.echo("✅ '.shopifyignore' has been created.");
  } else {
    shell.echo("ℹ️ '.shopifyignore' already exists. Ensuring correct content.");
  }

  const shopifyIgnoreContent = fs.readFileSync(shopifyIgnorePath, "utf8");
  if (
    !shopifyIgnoreContent.includes("package.json") ||
    !shopifyIgnoreContent.includes("package-lock.json") ||
    !shopifyIgnoreContent.includes("tailwind.config.js") ||
    !shopifyIgnoreContent.includes("tailwind-config.css") ||
    !shopifyIgnoreContent.includes("html-ref.html")
  ) {
    shell.echo("📄 Updating '.shopifyignore'...");
    fs.appendFileSync(
      shopifyIgnorePath,
      `
package.json
package-lock.json
tailwind.config.js
tailwind-config.css
html-ref.html
      `
    );
    shell.echo("✅ '.shopifyignore' has been updated.");
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

  // Prompt for version selection
  promptForVersion().then(async (version) => {
    if (version === "3") {
      await installTailwindV3();
    } else {
      await installTailwindV4();
    }
    rl.close();
  });
}

async function installTailwindV3() {
  shell.echo("⬇️ Installing Tailwind CSS v3 and its dependencies...");
  if (
    shell.exec("npm install -D tailwindcss@3.4.15 postcss autoprefixer")
      .code !== 0
  ) {
    shell.echo("❌ Failed to install Tailwind CSS v3.");
    shell.exit(1);
  }

  // Generate Tailwind config file for v3
  shell.echo("⚙️ Generating Tailwind v3 config file...");
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

  // Add build script to package.json
  const packageJsonPath = "package.json";
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  packageJson.scripts = packageJson.scripts || {};
  packageJson.scripts.tailwind =
    "npx tailwindcss -i ./tailwind-config.css -o ./assets/tailwind.css --watch";
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

  // Add stylesheet link to 'theme.liquid'
  addTailwindToThemeLiquid();

  // Create and update .gitignore and .shopifyignore
  createGitIgnore();
  createShopifyIgnore();

  shell.echo("🎉 Tailwind CSS v3 has been installed and configured successfully!");
  shell.echo("👉 To build your CSS, run: npm run tailwind");
}

async function installTailwindV4() {
  shell.echo("⬇️ Installing Tailwind CSS v4 and its CLI...");
  
  // Install Tailwind v4 and CLI
  if (shell.exec("npm install -D tailwindcss @tailwindcss/cli").code !== 0) {
    shell.echo("❌ Failed to install Tailwind CSS v4 and CLI.");
    shell.exit(1);
  }
  
  shell.echo("✅ Successfully installed Tailwind CSS v4 and CLI");
  
  // Add package.json to .shopifyignore
  const shopifyIgnorePath = ".shopifyignore";
  const v4IgnoreContent = `
package.json
  `;
  
  if (fs.existsSync(shopifyIgnorePath)) {
    const currentContent = fs.readFileSync(shopifyIgnorePath, "utf8");
    if (!currentContent.includes("package.json")) {
      fs.writeFileSync(shopifyIgnorePath, currentContent + v4IgnoreContent);
    }
  } else {
    fs.writeFileSync(shopifyIgnorePath, v4IgnoreContent);
  }
  
  shell.echo("✅ Updated .shopifyignore with package.json");

  // Create assets directory if it doesn't exist
  if (!fs.existsSync("assets")) {
    fs.mkdirSync("assets");
  }

  // Create tailwind-config.css in assets directory
  const configPath = "assets/tailwind-config.css";
  const configContent = `@import "tailwindcss" prefix(tw);

@theme {
    --breakpoint-sm: 450px;
    --breakpoint-md: 768px;
    --breakpoint-lg: 990px;
    --breakpoint-xl: 1280px;
}`;

  fs.writeFileSync(configPath, configContent);
  shell.echo("✅ Created tailwind-config.css in assets directory");

  // Add build script to package.json
  const packageJsonPath = "package.json";
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  packageJson.scripts = packageJson.scripts || {};
  packageJson.scripts.tailwind = "npx @tailwindcss/cli -i ./assets/tailwind-config.css -o ./assets/tailwind-output.css --watch";
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  shell.echo("✅ Added Tailwind v4 build script to package.json");

  // Add stylesheet link to theme.liquid
  addTailwindToThemeLiquid("4");
}

// Run the installation function
installTailwindCSS();
