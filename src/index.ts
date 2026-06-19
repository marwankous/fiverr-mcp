import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { updateProfile } from "./tools/profile.js";
import {
  listGigs,
  getGig,
  createGig,
  updateGig,
  pauseGig,
  activateGig,
  deleteGig,
} from "./tools/gigs.js";
import { listOrders, getOrder } from "./tools/orders.js";
import { listMessages, getConversation } from "./tools/messages.js";
import { getAnalytics } from "./tools/analytics.js";
import { executeJs } from "./tools/execute_js.js";
import { PackageSchema } from "./schemas.js";
import "dotenv/config";

const server = new McpServer({ name: "fiverr-mcp", version: "1.0.0" });

function toolError(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  return { content: [{ type: "text" as const, text: `Error: ${msg}` }], isError: true as const };
}

server.tool(
  "update_profile",
  "Update your Fiverr seller profile (bio, title, name, picture, skills, languages)",
  {
    displayName: z.string().optional().describe("Your public display name"),
    professionalTitle: z.string().optional().describe("Your seller tagline"),
    bio: z.string().optional().describe("Your seller description"),
    profilePicture: z.string().optional().describe("Local file path to profile image"),
    skills: z.array(z.string()).optional().describe("List of skills"),
    languages: z
      .array(z.object({
        lang: z.string(),
        level: z.enum(["basic", "conversational", "fluent", "native"]),
      }))
      .optional()
      .describe("Spoken languages with proficiency level"),
  },
  async (input) => {
    try {
      const result = await updateProfile(input);
      return { content: [{ type: "text" as const, text: result }] };
    } catch (e) { return toolError(e); }
  }
);

server.tool(
  "list_gigs",
  "List all your Fiverr gigs with status and metrics",
  {},
  async () => {
    try {
      const gigs = await listGigs();
      return { content: [{ type: "text" as const, text: JSON.stringify(gigs, null, 2) }] };
    } catch (e) { return toolError(e); }
  }
);

server.tool(
  "get_gig",
  "Get full details of a specific gig",
  { gigId: z.string().describe("The gig ID (from list_gigs)") },
  async ({ gigId }) => {
    try {
      const gig = await getGig({ gigId });
      return { content: [{ type: "text" as const, text: JSON.stringify(gig, null, 2) }] };
    } catch (e) { return toolError(e); }
  }
);

const gigFields = {
  category: z.string().optional(),
  subcategory: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).max(5).optional(),
  packages: z.array(PackageSchema).optional(),
  faq: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
  requirements: z.array(z.string()).optional(),
  gallery: z.array(z.string()).optional().describe("Local file paths to images/videos"),
};

server.tool(
  "create_gig",
  "Create and publish a new Fiverr gig",
  { title: z.string().describe("Gig title"), ...gigFields },
  async (input) => {
    try {
      const result = await createGig(input);
      return { content: [{ type: "text" as const, text: result }] };
    } catch (e) { return toolError(e); }
  }
);

server.tool(
  "update_gig",
  "Update title, description, or tags on an existing Fiverr gig",
  { gigId: z.string().describe("The gig ID (from list_gigs)"), title: z.string().optional(), ...gigFields },
  async ({ gigId, ...input }) => {
    try {
      const result = await updateGig(gigId, input);
      return { content: [{ type: "text" as const, text: result }] };
    } catch (e) { return toolError(e); }
  }
);

server.tool(
  "pause_gig",
  "Pause (deactivate) a Fiverr gig",
  { gigId: z.string().describe("The gig ID (from list_gigs)") },
  async ({ gigId }) => {
    try {
      const result = await pauseGig({ gigId });
      return { content: [{ type: "text" as const, text: result }] };
    } catch (e) { return toolError(e); }
  }
);

server.tool(
  "activate_gig",
  "Re-activate a paused Fiverr gig",
  { gigId: z.string().describe("The gig ID (from list_gigs)") },
  async ({ gigId }) => {
    try {
      const result = await activateGig({ gigId });
      return { content: [{ type: "text" as const, text: result }] };
    } catch (e) { return toolError(e); }
  }
);

server.tool(
  "delete_gig",
  "Permanently delete a Fiverr gig",
  { gigId: z.string().describe("The gig ID (from list_gigs)") },
  async ({ gigId }) => {
    try {
      const result = await deleteGig({ gigId });
      return { content: [{ type: "text" as const, text: result }] };
    } catch (e) { return toolError(e); }
  }
);

server.tool(
  "list_orders",
  "List your Fiverr orders (active, completed, or cancelled)",
  { status: z.enum(["active", "completed", "cancelled"]).optional() },
  async ({ status }) => {
    try {
      const result = await listOrders({ status });
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    } catch (e) { return toolError(e); }
  }
);

server.tool(
  "get_order",
  "Get full details of a specific Fiverr order",
  { orderId: z.string().describe("The order ID") },
  async ({ orderId }) => {
    try {
      const result = await getOrder(orderId);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    } catch (e) { return toolError(e); }
  }
);

server.tool(
  "list_messages",
  "List your Fiverr inbox conversations",
  { unreadOnly: z.boolean().optional().describe("Return only unread conversations") },
  async ({ unreadOnly }) => {
    try {
      const result = await listMessages({ unreadOnly });
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    } catch (e) { return toolError(e); }
  }
);

server.tool(
  "get_conversation",
  "Get full message thread for a conversation",
  { conversationId: z.string().describe("The conversation ID") },
  async ({ conversationId }) => {
    try {
      const result = await getConversation(conversationId);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    } catch (e) { return toolError(e); }
  }
);

server.tool(
  "get_analytics",
  "Get gig analytics (impressions, clicks, orders) for your gigs",
  {
    gigId: z.string().optional().describe("Filter to a specific gig ID"),
    from: z.string().optional().describe("Start date (YYYY-MM-DD)"),
    to: z.string().optional().describe("End date (YYYY-MM-DD)"),
  },
  async ({ gigId, from, to }) => {
    try {
      const result = await getAnalytics({ gigId, from, to });
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    } catch (e) { return toolError(e); }
  }
);

server.tool(
  "execute_js",
  "Run arbitrary JavaScript in the MAIN world of a Fiverr browser tab and return the result. Use this to inspect the DOM, intercept data, or perform any action on the page. The code runs as the body of an async function so you can use await and return values.",
  {
    code: z.string().describe("JavaScript source to execute (body of an async function — use return to send data back)"),
    url: z.string().optional().describe("Fiverr page URL to navigate to first (default: current Fiverr tab)"),
    reload: z.boolean().optional().describe("Force-reload the tab before executing (default false)"),
  },
  async ({ code, url, reload }) => {
    try {
      const result = await executeJs({ code, url, reload });
      const text = typeof result === "string" ? result : JSON.stringify(result, null, 2);
      return { content: [{ type: "text" as const, text: text ?? "undefined" }] };
    } catch (e) { return toolError(e); }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
