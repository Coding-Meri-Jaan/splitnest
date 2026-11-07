import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { FormEvent } from "react";
import { describe, expect, it, vi } from "vitest";

import { ConfirmSubmitButton } from "./confirm-submit-button";

function renderInForm() {
  const onSubmit = vi.fn((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  });

  render(
    <form onSubmit={onSubmit}>
      <ConfirmSubmitButton
        confirmMessage="Delete this expense? This cannot be undone."
        aria-label="Delete expense"
      >
        Delete
      </ConfirmSubmitButton>
    </form>,
  );

  return onSubmit;
}

describe("ConfirmSubmitButton", () => {
  it("opens an in-page dialog instead of relying on window.confirm", async () => {
    const confirmSpy = vi.spyOn(window, "confirm");
    renderInForm();

    fireEvent.click(screen.getByRole("button", { name: "Delete expense" }));

    expect(
      await screen.findByText("Delete this expense? This cannot be undone."),
    ).toBeTruthy();
    expect(confirmSpy).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("does not submit the form when the dialog is cancelled", async () => {
    const onSubmit = renderInForm();

    fireEvent.click(screen.getByRole("button", { name: "Delete expense" }));
    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits the form after the destructive action is confirmed", async () => {
    const onSubmit = renderInForm();

    fireEvent.click(screen.getByRole("button", { name: "Delete expense" }));
    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  });
});
