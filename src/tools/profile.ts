import { sendCommand } from "../bridge-client.js";
import type { UpdateProfileInput } from "../schemas.js";

export async function updateProfile(input: UpdateProfileInput): Promise<string> {
  return sendCommand("update_profile", input) as Promise<string>;
}
