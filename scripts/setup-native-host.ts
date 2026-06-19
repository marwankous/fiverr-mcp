import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import readline from "node:readline";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const BRIDGE_DIR = path.join(ROOT, "bridge");
const CMD_PATH = path.join(BRIDGE_DIR, "run-bridge.cmd");
const MANIFEST_TEMPLATE = path.join(BRIDGE_DIR, "manifest.json");

const BROWSERS = [
  {
    name: "Chrome",
    dir: path.join(process.env.APPDATA ?? "", "Google", "Chrome", "NativeMessagingHosts"),
    regKey: "HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\com.fiverr_mcp.bridge",
  },
  {
    name: "Edge",
    dir: path.join(process.env.APPDATA ?? "", "Microsoft", "Edge", "NativeMessagingHosts"),
    regKey: "HKCU\\Software\\Microsoft\\Edge\\NativeMessagingHosts\\com.fiverr_mcp.bridge",
  },
];

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (ans) => { rl.close(); resolve(ans.trim()); }));
}

async function main() {
  console.log("=== Fiverr MCP Bridge Setup ===\n");
  console.log("To find your extension ID:");
  console.log("  1. Open chrome://extensions (or edge://extensions)");
  console.log("  2. Enable Developer mode (top-right toggle)");
  console.log("  3. Load the 'extension/' folder as an unpacked extension");
  console.log("  4. Copy the ID shown under the extension name\n");

  const extId = await prompt("Paste your extension ID: ");
  if (!extId || extId === "YOUR_EXTENSION_ID" || extId.length < 20) {
    console.error("Invalid extension ID. Please try again.");
    process.exit(1);
  }

  const template = JSON.parse(await fs.readFile(MANIFEST_TEMPLATE, "utf-8"));
  template.path = CMD_PATH.replace(/\\/g, "\\\\");
  template.allowed_origins = [`chrome-extension://${extId}/`];

  for (const browser of BROWSERS) {
    const dest = path.join(browser.dir, "com.fiverr_mcp.bridge.json");
    try {
      await fs.mkdir(browser.dir, { recursive: true });
      await fs.writeFile(dest, JSON.stringify(template, null, 2));
      console.log(`[${browser.name}] Wrote manifest to: ${dest}`);

      execSync(`reg add "${browser.regKey}" /ve /t REG_SZ /d "${dest.replace(/\\/g, "\\\\")}" /f`);
      console.log(`[${browser.name}] Added registry key: ${browser.regKey}`);
    } catch (e) {
      console.log(`[${browser.name}] Skipped (not installed or no permission): ${(e as Error).message}`);
    }
  }

  console.log("\nDone. Reload the extension in your browser to connect the bridge.");
}

main().catch((e) => { console.error(e); process.exit(1); });
