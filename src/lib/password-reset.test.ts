import { describe, expect, it } from "vitest";

import {
  isRecoveryReturn,
  newPasswordError,
  newPasswordProblem,
  resetRequestError,
} from "./password-reset";

describe("FINAL-1B forgot password: clear messages when sending fails", () => {
  it("recognises the sending limit in its different forms", () => {
    expect(resetRequestError({ status: 429, message: "Too many requests" })).toBe("rate");
    expect(
      resetRequestError({
        code: "over_email_send_rate_limit",
        message: "email rate limit exceeded",
      }),
    ).toBe("rate");
    expect(
      resetRequestError({
        message: "For security purposes, you can only request this after 42 seconds.",
      }),
    ).toBe("rate");
  });
  it("other failures", () => {
    expect(resetRequestError({ message: "Unable to validate email address: invalid format" })).toBe(
      "email",
    );
    expect(resetRequestError({ message: "Failed to fetch" })).toBe("network");
    expect(resetRequestError({ message: "boom", status: 500 })).toBe("generic");
    expect(resetRequestError(null)).toBeNull();
  });
});

describe("FINAL-1B new password", () => {
  it("checks length and confirmation before sending", () => {
    expect(newPasswordProblem("12345", "12345")).toBe("short");
    expect(newPasswordProblem("segura123", "segura124")).toBe("mismatch");
    expect(newPasswordProblem("segura123", "segura123")).toBeNull();
  });
  it("maps server answers", () => {
    expect(
      newPasswordError({
        code: "same_password",
        message: "New password should be different from the old password.",
      }),
    ).toBe("same");
    expect(
      newPasswordError({
        code: "weak_password",
        message: "Password is known to be weak and easy to guess",
      }),
    ).toBe("weak");
    expect(newPasswordError({ status: 401, message: "Auth session missing!" })).toBe("expired");
    expect(newPasswordError({ message: "Failed to fetch" })).toBe("network");
  });
});

describe("FINAL-1B recovery links in the callback", () => {
  const q = (s: string) => new URLSearchParams(s);
  it("detects recovery links in every format", () => {
    expect(isRecoveryReturn(q(""), q("access_token=x&type=recovery"), false)).toBe(true);
    expect(isRecoveryReturn(q("token_hash=x&type=recovery"), q(""), false)).toBe(true);
    expect(isRecoveryReturn(q("code=abc"), q(""), true)).toBe(true);
  });
  it("a sign-up confirmation is not a recovery", () => {
    expect(isRecoveryReturn(q("code=abc"), q(""), false)).toBe(false);
    expect(isRecoveryReturn(q("token_hash=x&type=signup"), q(""), false)).toBe(false);
    expect(isRecoveryReturn(q(""), q("access_token=x&type=signup"), false)).toBe(false);
  });
});
