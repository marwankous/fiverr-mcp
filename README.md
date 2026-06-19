# fiverr-mcp

Give [Claude Code](https://claude.ai/code) live access to your Fiverr seller account. Manage gigs, orders, messages, analytics, and your profile directly from your AI assistant — no API key required.

> **How it works:** A Chrome/Edge extension runs inside your already-logged-in Fiverr tab and acts as a bridge. Claude talks to the extension over a local native messaging channel. Your credentials never leave your browser.

---

## Architecture

```
Claude Code ──stdio──▶ MCP server (Node.js)
                              │
                    native messaging (stdin/stdout)
                              │
                    Chrome / Edge extension
                              │
                    fiverr.com (your logged-in tab)
```

No credentials are stored anywhere. The extension uses your existing browser session.

---

## Requirements

- **Node.js 18+**
- **Chrome** or **Microsoft Edge** (desktop)
- **Claude Code** CLI — [install guide](https://docs.anthropic.com/claude-code)
- A Fiverr seller account, logged in in your browser

> Windows is fully supported. macOS/Linux support for the native messaging setup is a work in progress (PRs welcome).

---

## Installation

### 1. Clone and build

```sh
git clone https://github.com/marwankous/fiverr-mcp.git
cd fiverr-mcp
npm install
npm run build
```

---

### 2. Load the browser extension

The extension lives in the `extension/` folder. You load it as an **unpacked extension** — no Chrome Web Store required.

**Chrome:**
1. Open `chrome://extensions` in your browser
2. Toggle **Developer mode** on (top-right corner)
3. Click **Load unpacked**
4. Select the `extension/` folder inside this repo

**Edge:**
1. Open `edge://extensions`
2. Toggle **Developer mode** on (left sidebar)
3. Click **Load unpacked**
4. Select the `extension/` folder inside this repo

You should see **"Fiverr MCP Bridge"** appear in your extensions list.

---

### 3. Copy your extension ID

Every unpacked extension gets a unique ID. You need it for the next step.

1. On the extensions page (`chrome://extensions` or `edge://extensions`), find **Fiverr MCP Bridge**
2. Make sure **Developer mode** is on — the ID is only visible when it is
3. The ID appears directly below the extension name as a 32-character string of lowercase letters:

   ```
   Fiverr MCP Bridge
   ID: abcdefghijklmnopabcdefghijklmnop
   ```

4. Copy that string

3. Copy it — you'll paste it in the next step

---

### 4. Register the native messaging host

This step links your browser to the bridge process so the extension can launch it automatically.

```sh
npm run setup
```

The script will ask you to paste your extension ID, then writes the required manifest files and registry keys for Chrome and Edge.

**What it does:**
- Writes `com.fiverr_mcp.bridge.json` to `AppData\Roaming\Google\Chrome\NativeMessagingHosts\`
- Writes the same to `AppData\Roaming\Microsoft\Edge\NativeMessagingHosts\`
- Adds the registry keys `HKCU\Software\Google\Chrome\NativeMessagingHosts\com.fiverr_mcp.bridge` and the Edge equivalent

---

### 5. Register the MCP server with Claude Code

```sh
claude mcp add fiverr-mcp -- node "/absolute/path/to/fiverr-mcp/dist/index.js"
```

Replace `/absolute/path/to/fiverr-mcp` with the actual path where you cloned the repo.

**Verify it's registered:**
```sh
claude mcp list
```

---

### 6. Reload the extension

After running setup, go back to `chrome://extensions` (or `edge://extensions`) and click the **reload icon** on the Fiverr MCP Bridge extension. This picks up the newly registered native host.

---

### 7. Open Fiverr in your browser

Make sure you are **logged into Fiverr** in Chrome or Edge. The extension operates on your active session — it needs a Fiverr tab open to execute commands.

---

### 8. Start a Claude Code session

```sh
claude
```

All tools are now available. Try:

```
list my fiverr gigs
```

---

## Available tools

| Tool | What it does |
|------|-------------|
| `list_gigs` | List all your gigs with status, impressions, clicks, and orders |
| `get_gig` | Full details of a specific gig |
| `create_gig` | Create and publish a new gig (title, description, packages, FAQ, requirements) |
| `update_gig` | Edit any field on an existing gig |
| `pause_gig` | Pause (deactivate) a gig |
| `activate_gig` | Re-activate a paused gig |
| `delete_gig` | Permanently delete a gig |
| `update_profile` | Update your bio, professional title, display name, skills, or languages |
| `list_orders` | List orders, optionally filtered by status |
| `get_order` | Full details of a specific order |
| `list_messages` | List your inbox conversations |
| `get_conversation` | Full message thread for a conversation |
| `get_analytics` | Impressions, clicks, and orders over a date range |
| `execute_js` | Run arbitrary JavaScript in your Fiverr tab (power users / automation) |

---

## Example prompts

```
Show me all my active gigs and their click-through rates this month.
```

```
Create a new gig titled "I will build a local AI assistant for your business"
with a basic package at $50, standard at $100, and premium at $200.
```

```
Update the description on gig 123456789 to focus more on small businesses.
```

```
What orders do I have active right now? Summarize what each buyer needs.
```

```
Show me my last 30 days of analytics. Which gig is performing best?
```

```
Update my profile bio to highlight RAG systems and local AI deployment.
```

---

## Tool reference

### `list_gigs`
No input required.

```ts
// Returns:
{ id: string; title: string; status: "active" | "paused" | "denied"; impressions: number; clicks: number; orders: number }[]
```

### `get_gig` · `pause_gig` · `activate_gig` · `delete_gig`
```ts
{ gigId: string }
```

### `create_gig`
```ts
{
  title: string
  category?: string
  subcategory?: string
  description?: string
  tags?: string[]                          // max 5
  packages?: {
    name: "basic" | "standard" | "premium"
    price: number
    deliveryDays: number
    revisions: number
    description: string
  }[]
  faq?: { question: string; answer: string }[]
  requirements?: string[]
}
```

### `update_gig`
Same as `create_gig`, all fields optional, plus `gigId: string` (required).

### `update_profile`
```ts
{
  displayName?: string
  professionalTitle?: string
  bio?: string
  skills?: string[]
  languages?: { lang: string; level: "basic" | "conversational" | "fluent" | "native" }[]
}
```

### `list_orders`
```ts
{ status?: "active" | "completed" | "cancelled" }
```

### `list_messages`
```ts
{ unreadOnly?: boolean }
```

### `get_conversation`
```ts
{ conversationId: string }
```

### `get_order`
```ts
{ orderId: string }
```

### `get_analytics`
```ts
{ gigId?: string; from?: string; to?: string }   // dates: YYYY-MM-DD
```

### `execute_js`
```ts
{
  code: string     // body of an async function — use return to send data back
  url?: string     // navigate to this Fiverr URL first
  reload?: boolean // force-reload the tab before executing
}
```

---

## Troubleshooting

**"Fiverr MCP bridge not reachable"**
- Chrome or Edge must be open with a Fiverr tab
- Make sure you are logged into Fiverr
- Confirm the extension is enabled on `chrome://extensions`
- Re-run `npm run setup` and reload the extension if you moved the repo folder

**"Fiverr MCP command timed out"**
- The Fiverr page took too long to respond — just retry
- Check if Fiverr is showing a CAPTCHA or session-expired prompt in your browser

**Tools not appearing in Claude Code**
- Run `claude mcp list` and confirm `fiverr-mcp` is listed
- Start a **new** Claude Code session after registering the MCP server

**Extension ID changed after browser restart**
- Unpacked extension IDs are stable as long as you don't remove and re-add the extension
- If you reload it from a different path, the ID changes — re-run `npm run setup` with the new ID

**On macOS or Linux**
- The `npm run setup` script currently targets Windows (`AppData` paths + registry)
- You can manually write the native messaging manifest to:
  - macOS Chrome: `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/`
  - Linux Chrome: `~/.config/google-chrome/NativeMessagingHosts/`
- PRs to automate this are welcome

---

## Development

```sh
npm run dev     # run MCP server with tsx (no build needed)
npm test        # run vitest test suite
npm run build   # compile src/ → dist/ and bridge/ → bridge/dist/
```

Project structure:

```
extension/          Chrome/Edge extension (content scripts + background)
  background.js     Routes MCP commands to the correct Fiverr tab
  content/
    interceptor.js  Intercepts Fiverr's internal API responses
    router.js       Dispatches commands to action handlers
  actions/          Per-feature action handlers (gigs, orders, profile…)

src/                MCP server (TypeScript)
  index.ts          Tool definitions and server entry point
  bridge-client.ts  Native messaging client
  schemas.ts        Shared zod schemas
  tools/            One file per tool group

bridge/             Native messaging host (Node.js)
  index.ts          Bridges Chrome native messaging ↔ TCP socket

scripts/
  setup-native-host.ts   Registers the native host for Chrome and Edge
```

---

## Contributing

Pull requests are welcome. A few areas where help is appreciated:

- **macOS / Linux setup script** — the current `npm run setup` only handles Windows
- **Additional tools** — buyer requests, custom offers, gig packages editor
- **Firefox support** — native messaging works in Firefox with a slightly different manifest format

Please open an issue before starting a large change so we can coordinate.

---

## License

MIT — see [LICENSE](LICENSE)
