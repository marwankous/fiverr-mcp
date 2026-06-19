import { sendCommand } from "../bridge-client.js";

export async function listMessages(params: { unreadOnly?: boolean }): Promise<unknown> {
  return sendCommand("list_messages", params);
}

export async function getConversation(conversationId: string): Promise<unknown> {
  return sendCommand("get_conversation", { conversationId });
}
