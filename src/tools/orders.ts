import { sendCommand } from "../bridge-client.js";

export type OrderStatus = "active" | "completed" | "cancelled";

export async function listOrders(params: { status?: OrderStatus }): Promise<unknown> {
  return sendCommand("list_orders", params);
}

export async function getOrder(orderId: string): Promise<unknown> {
  return sendCommand("get_order", { orderId });
}
