import { describe, expect, it } from "vitest";
import { comparePassword, hashPassword } from "../src/utils/password";
import { signAuthToken, verifyAuthToken } from "../src/utils/jwt";

describe("auth utils", () => {
  it("hashes and compares passwords", async () => {
    const hash = await hashPassword("super-secret-password");
    const isValid = await comparePassword("super-secret-password", hash);
    expect(isValid).toBe(true);
  });

  it("signs and verifies jwt", () => {
    const token = signAuthToken(123);
    const payload = verifyAuthToken(token);
    expect(payload.userId).toBe(123);
  });
});
