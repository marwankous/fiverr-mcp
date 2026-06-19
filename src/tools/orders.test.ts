import { describe, it, expect, vi, afterEach } from "vitest";

// Mock bridge-client before importing orders
vi.mock("../bridge-client.js", () => ({
  sendCommand: vi.fn(),
}));

import { sendCommand } from "../bridge-client.js";
import { listOrders, getOrder } from "./orders.js";

afterEach(() => vi.clearAllMocks());

describe("listOrders", () => {
  it("calls sendCommand with list_orders and empty params when no status", async () => {
    (sendCommand as any).mockResolvedValue([{ id: "1", status: "active" }]);
    const result = await listOrders({});
    expect(sendCommand).toHaveBeenCalledWith("list_orders", {});
    expect(result).toEqual([{ id: "1", status: "active" }]);
  });

  it("passes status param through", async () => {
    (sendCommand as any).mockResolvedValue([]);
    await listOrders({ status: "completed" });
    expect(sendCommand).toHaveBeenCalledWith("list_orders", { status: "completed" });
  });
});

describe("getOrder", () => {
  it("calls sendCommand with get_order and orderId", async () => {
    (sendCommand as any).mockResolvedValue({ id: "ord-1", buyer: "alice" });
    const result = await getOrder("ord-1");
    expect(sendCommand).toHaveBeenCalledWith("get_order", { orderId: "ord-1" });
    expect(result).toEqual({ id: "ord-1", buyer: "alice" });
  });
});
