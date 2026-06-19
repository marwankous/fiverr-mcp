import net from "node:net";
import { randomUUID } from "node:crypto";

const BRIDGE_PORT = 9797;
const CONNECT_TIMEOUT = 5000;   // ms to establish the TCP connection
const COMMAND_TIMEOUT  = 60000; // ms to wait for the extension to respond (tab nav + DOM ops)
const NOT_REACHABLE = "Fiverr MCP bridge not reachable — make sure Edge/Chrome is open with the Fiverr MCP Bridge extension installed";
const TIMED_OUT = "Fiverr MCP command timed out — the page may be loading slowly, try again";

export function sendCommand(tool: string, params: object): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    const id = randomUUID();
    let settled = false;
    let buf = "";

    function settle(fn: () => void) {
      if (!settled) { settled = true; socket.destroy(); fn(); }
    }

    // Short timeout just for the TCP connection phase
    const connectTimer = setTimeout(
      () => settle(() => reject(new Error(NOT_REACHABLE))),
      CONNECT_TIMEOUT
    );

    // Longer timeout for the full command round-trip (tab nav + DOM ops can take ~10-30s)
    let commandTimer: ReturnType<typeof setTimeout>;

    socket.connect(BRIDGE_PORT, "127.0.0.1", () => {
      clearTimeout(connectTimer);
      commandTimer = setTimeout(
        () => settle(() => reject(new Error(TIMED_OUT))),
        COMMAND_TIMEOUT
      );
      socket.write(JSON.stringify({ id, tool, params }) + "\n");
    });

    socket.on("data", (chunk) => {
      buf += chunk.toString("utf-8");
      const lines = buf.split("\n");
      buf = lines.pop()!;
      for (const line of lines) {
        if (!line.trim()) continue;
        const msg = JSON.parse(line) as { id: string; result?: unknown; error?: string };
        if (msg.id === id) {
          clearTimeout(commandTimer);
          if (msg.error) {
            settle(() => reject(new Error(msg.error)));
          } else {
            settle(() => resolve(msg.result));
          }
        }
      }
    });

    socket.on("error", () => { clearTimeout(connectTimer); clearTimeout(commandTimer); settle(() => reject(new Error(NOT_REACHABLE))); });
    socket.on("close", () => { clearTimeout(connectTimer); clearTimeout(commandTimer); settle(() => reject(new Error(NOT_REACHABLE))); });
  });
}
