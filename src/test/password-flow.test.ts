import { describe, expect, it } from "vitest";
import { passwordUpdateOutcome } from "../lib/password-flow";

describe("first-login password safety net", () => {
  it("allows continuing after an update failure", () => {
    expect(passwordUpdateOutcome(true).allowContinue).toBe(true);
  });
  it("keeps must_change_password after an update failure", () => {
    expect(passwordUpdateOutcome(true).clearMustChangePassword).toBe(false);
  });
  it("clears the flag only after a successful password update", () => {
    expect(passwordUpdateOutcome(false).clearMustChangePassword).toBe(true);
  });
});