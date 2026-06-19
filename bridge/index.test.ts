import { describe, it, expect } from "vitest";
import { NativeReader, encodeNative } from "./index.js";

describe("NativeReader", () => {
  it("parses a single complete message", () => {
    const reader = new NativeReader();
    const msgs: unknown[] = [];
    reader.on("message", (m) => msgs.push(m));

    const payload = Buffer.from(JSON.stringify({ hello: "world" }), "utf-8");
    const header = Buffer.alloc(4);
    header.writeUInt32LE(payload.length, 0);
    reader.feed(Buffer.concat([header, payload]));

    expect(msgs).toEqual([{ hello: "world" }]);
  });

  it("handles message split across two chunks", () => {
    const reader = new NativeReader();
    const msgs: unknown[] = [];
    reader.on("message", (m) => msgs.push(m));

    const payload = Buffer.from(JSON.stringify({ split: true }), "utf-8");
    const header = Buffer.alloc(4);
    header.writeUInt32LE(payload.length, 0);
    const full = Buffer.concat([header, payload]);
    reader.feed(full.subarray(0, 5));
    reader.feed(full.subarray(5));

    expect(msgs).toEqual([{ split: true }]);
  });

  it("handles two messages in one chunk", () => {
    const reader = new NativeReader();
    const msgs: unknown[] = [];
    reader.on("message", (m) => msgs.push(m));

    function frame(obj: object) {
      const p = Buffer.from(JSON.stringify(obj), "utf-8");
      const h = Buffer.alloc(4);
      h.writeUInt32LE(p.length, 0);
      return Buffer.concat([h, p]);
    }
    reader.feed(Buffer.concat([frame({ a: 1 }), frame({ b: 2 })]));

    expect(msgs).toEqual([{ a: 1 }, { b: 2 }]);
  });
});

describe("encodeNative", () => {
  it("produces a decodable frame", () => {
    const msg = { id: "x", result: 42 };
    const buf = encodeNative(msg);
    const len = buf.readUInt32LE(0);
    const parsed = JSON.parse(buf.subarray(4, 4 + len).toString("utf-8"));
    expect(parsed).toEqual(msg);
  });
});
