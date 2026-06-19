import { sendCommand } from "../bridge-client.js";

export async function getAnalytics(params: { gigId?: string; from?: string; to?: string }): Promise<unknown> {
  return sendCommand("get_analytics", params);
}
