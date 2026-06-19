import { describe, it, expect, afterEach } from "vitest";
import net from "node:net";
import { sendCommand } from "./bridge-client.js";

let mockServer: net.Server;

afterEach(() => {
  if (mockServer?.listening) mockServer.close();
});

function startMockBridge(port: number, handler: (cmd: object) => object) {
  return new Promise<void>((resolve) => {
    mockServer = net.createServer((socket) => {
      let buf = "";
      socket.on("data", (chunk) => {
        buf += chunk.toString("utf-8");
        const lines = buf.split("\n");
        buf = lines.pop()!;
        for (const line of lines) {
          if (!line.trim()) continue;
          const cmd = JSON.parse(line);
          const response = handler(cmd);
          socket.write(JSON.stringify(response) + "\n");
        }
      });
    });
    mockServer.listen(port, "127.0.0.1", resolve);
  });
}

describe("sendCommand", () => {
  it("sends command and resolves with result", async () => {
    await startMockBridge(9797, (cmd: any) => ({ id: cmd.id, result: { gigs: [] } }));
    const result = await sendCommand("list_gigs", {});
    expect(result).toEqual({ gigs: [] });
  });

  it("rejects when bridge returns error", async () => {
    await startMockBridge(9797, (cmd: any) => ({ id: cmd.id, error: "page not found" }));
    await expect(sendCommand("list_gigs", {})).rejects.toThrow("page not found");
  });

  it("rejects with bridge-not-reachable when connection refused", async () => {
    // No server started — port 9797 should be closed
    await expect(sendCommand("list_gigs", {})).rejects.toThrow(
      "Fiverr MCP bridge not reachable"
    );
  }, 8000);
});
