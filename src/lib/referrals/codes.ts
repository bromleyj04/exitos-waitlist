import { customAlphabet } from "nanoid";

const makeCode = customAlphabet("23456789ABCDEFGHJKLMNPQRSTUVWXYZ", 8);

export function createReferralCode() {
  return makeCode();
}

