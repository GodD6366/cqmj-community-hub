import { describe, expect, it } from "vitest";
import { buildAdminTabHref, parseAdminTab } from "../src/lib/admin-tabs";

describe("admin tabs", () => {
  it("parses valid tab keys", () => {
    expect(parseAdminTab("users")).toBe("users");
    expect(parseAdminTab("invites")).toBe("invites");
    expect(parseAdminTab("posts")).toBe("posts");
  });

  it("falls back to users for missing or invalid values", () => {
    expect(parseAdminTab(undefined)).toBe("users");
    expect(parseAdminTab(null)).toBe("users");
    expect(parseAdminTab("unknown")).toBe("users");
  });

  it("uses the first array value when search params repeat", () => {
    expect(parseAdminTab(["posts", "users"])).toBe("posts");
    expect(parseAdminTab(["invalid", "users"])).toBe("users");
  });

  it("builds stable admin tab hrefs", () => {
    expect(buildAdminTabHref("users")).toBe("/admin?tab=users");
    expect(buildAdminTabHref("invites")).toBe("/admin?tab=invites");
    expect(buildAdminTabHref("posts")).toBe("/admin?tab=posts");
  });
});
