import { randomBytes } from "crypto";

export function createInviteToken() {
  return randomBytes(24).toString("hex");
}
