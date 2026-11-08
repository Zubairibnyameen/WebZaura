import { describe, expect, it } from "vitest";
import { site } from "@/data/site";

describe("Unconfirmed social destinations", () => {
  it("does not publish an unconfirmed Instagram destination", () => {
    expect(site.instagram.href).toBe("");
  });
  it("does not publish an unconfirmed Facebook destination", () => {
    expect(site.facebook.href).toBe("");
  });
});