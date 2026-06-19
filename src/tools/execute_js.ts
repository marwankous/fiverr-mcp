import { sendCommand } from "../bridge-client.js";

export async function executeJs(params: {
  code: string;
  url?: string;
  reload?: boolean;
}): Promise<unknown> {
  return sendCommand("execute_js", params);
}
