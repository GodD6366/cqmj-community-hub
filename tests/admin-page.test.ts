import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUserFromCookieMock = vi.hoisted(() => vi.fn());
const isAdminUserMock = vi.hoisted(() => vi.fn());
const redirectMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth-server", () => ({
  getCurrentUserFromCookie: getCurrentUserFromCookieMock,
  isAdminUser: isAdminUserMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

describe("/admin page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redirectMock.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
  });

  it("passes a parsed tab to the admin client", async () => {
    getCurrentUserFromCookieMock.mockResolvedValue({ id: "admin-1", username: "admin", role: "admin" });
    isAdminUserMock.mockReturnValue(true);

    const { default: AdminPage } = await import("../src/app/admin/page");
    const view = await AdminPage({
      searchParams: Promise.resolve({ tab: "posts" }),
    });

    expect(view.props.initialTab).toBe("posts");
  });

  it("falls back to users when tab is invalid", async () => {
    getCurrentUserFromCookieMock.mockResolvedValue({ id: "admin-1", username: "admin", role: "admin" });
    isAdminUserMock.mockReturnValue(true);

    const { default: AdminPage } = await import("../src/app/admin/page");
    const view = await AdminPage({
      searchParams: Promise.resolve({ tab: "invalid" }),
    });

    expect(view.props.initialTab).toBe("users");
  });

  it("redirects guests to the admin login page", async () => {
    getCurrentUserFromCookieMock.mockResolvedValue(null);

    const { default: AdminPage } = await import("../src/app/admin/page");
    await expect(
      AdminPage({
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectMock).toHaveBeenCalledWith("/login?next=/admin");
  });
});
