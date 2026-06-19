import { sendCommand } from "../bridge-client.js";
import type { GigIdInput, CreateGigInput, UpdateGigInput } from "../schemas.js";

export type GigSummary = {
  id: string;
  title: string;
  status: "active" | "paused" | "denied";
  impressions: number;
  clicks: number;
  orders: number;
};

export async function listGigs(): Promise<GigSummary[]> {
  return sendCommand("list_gigs", {}) as Promise<GigSummary[]>;
}

export async function getGig(input: GigIdInput): Promise<Record<string, unknown>> {
  return sendCommand("get_gig", input) as Promise<Record<string, unknown>>;
}

export async function createGig(input: CreateGigInput): Promise<string> {
  return sendCommand("create_gig", input) as Promise<string>;
}

export async function updateGig(gigId: string, input: UpdateGigInput): Promise<string> {
  return sendCommand("update_gig", { gigId, ...input }) as Promise<string>;
}

export async function pauseGig(input: GigIdInput): Promise<string> {
  return sendCommand("pause_gig", input) as Promise<string>;
}

export async function activateGig(input: GigIdInput): Promise<string> {
  return sendCommand("activate_gig", input) as Promise<string>;
}

export async function deleteGig(input: GigIdInput): Promise<string> {
  return sendCommand("delete_gig", input) as Promise<string>;
}
