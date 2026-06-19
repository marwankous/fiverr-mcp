import { EventEmitter } from "node:events";
import net from "node:net";

// ---- Codec (exported for tests) ----

export class NativeReader extends EventEmitter {
  private buf = Buffer.alloc(0);

  feed(chunk: Buffer): void {
    this.buf = Buffer.concat([this.buf, chunk]);
    while (this.buf.length >= 4) {
      const len = this.buf.readUInt32LE(0);
      if (this.buf.length < 4 + len) break;
      const msg = JSON.parse(this.buf.subarray(4, 4 + len).toString("utf-8"));
      this.buf = this.buf.subarray(4 + len);
      this.emit("message", msg);
    }
  }
}

export function encodeNative(msg: object): Buffer {
  const payload = Buffer.from(JSON.stringify(msg), "utf-8");
  const header = Buffer.alloc(4);
  header.writeUInt32LE(payload.length, 0);
  return Buffer.concat([header, payload]);
}

// ---- Main (only runs when not imported by tests) ----

if (process.argv[1]?.endsWith("index.js") || process.argv[1]?.endsWith("index.ts")) {
  const pending = new Map<string, (res: object) => void>();
  const reader = new NativeReader();

  // Stdin = messages FROM extension (via Chrome native messaging)
  process.stdin.on("data", (chunk: Buffer) => reader.feed(chunk));
  process.stdin.on("end", () => process.exit(0));

  // When extension sends a response, resolve the pending MCP request
  reader.on("message", (msg: { id: string; result?: unknown; error?: string }) => {
    const resolve = pending.get(msg.id);
    if (resolve) {
      pending.delete(msg.id);
      resolve(msg as object);
    }
  });

  // TCP server — MCP server connects here
  const server = net.createServer((socket) => {
    let tcpBuf = "";
    const socketIds = new Set<string>(); // track IDs belonging to this socket

    socket.on("data", (chunk) => {
      tcpBuf += chunk.toString("utf-8");
      const lines = tcpBuf.split("\n");
      tcpBuf = lines.pop()!;
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const cmd = JSON.parse(line) as { id: string; tool: string; params: object };
          socketIds.add(cmd.id);
          // Forward to extension via native messaging stdout
          process.stdout.write(encodeNative(cmd));
          // When extension responds, write result back to this TCP socket
          pending.set(cmd.id, (res) => {
            if (!socket.destroyed) socket.write(JSON.stringify(res) + "\n");
          });
        } catch (e) {
          console.error("Bridge: bad TCP message:", e);
        }
      }
    });

    socket.on("error", () => {});
    socket.on("close", () => {
      // Only clear pending entries for this socket, not other connections
      for (const id of socketIds) {
        pending.delete(id);
      }
    });
  });

  server.listen(9797, "127.0.0.1");
}
