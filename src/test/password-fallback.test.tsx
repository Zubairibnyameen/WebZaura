import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ updateUser: vi.fn(), clearFlag: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { updateUser: mocks.updateUser } } }));
vi.mock("@/lib/leads.functions", () => ({ clearMustChangePassword: mocks.clearFlag, getMyProfile: vi.fn() }));
vi.mock("@tanstack/react-router", async (original) => ({
  ...await original<typeof import("@tanstack/react-router")>(),
  Link: ({ children }: { children: React.ReactNode }) => <a href="/forgot-password">{children}</a>,
}));
import { ForceChangePassword } from "@/routes/_authenticated/app";

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("password-update failure continuation", () => {
  it.each(["returned", "thrown"])("permits continuation on a %s error without clearing the stored flag", async (kind) => {
    if (kind === "returned") mocks.updateUser.mockResolvedValue({ error: new Error("Service unavailable") });
    else mocks.updateUser.mockRejectedValue(new Error("Network failure"));
    const onSkip = vi.fn();
    render(<ForceChangePassword onDone={vi.fn()} onSkip={onSkip} />);
    fireEvent.change(screen.getByLabelText(/Temporary password/), { target: { value: "TempPassword2026!" } });
    fireEvent.change(screen.getByLabelText(/New password/), { target: { value: "TestPassword2026!" } });
    fireEvent.change(screen.getByLabelText(/Repeat it/), { target: { value: "TestPassword2026!" } });
    fireEvent.click(screen.getByRole("button", { name: "Save and continue" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Continue into app" })).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "Continue into app" }));
    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(mocks.clearFlag).not.toHaveBeenCalled();
  });
});