import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

import type { SearchResult } from "@/lib/search";

import { SearchSuggest } from "./search-suggest";

const suggestions: SearchResult[] = [
  {
    id: "group-1",
    kind: "group",
    title: "Goa Trip",
    subtitle: "4 members",
    href: "/dashboard/groups/group-1",
  },
  {
    id: "expense-1",
    kind: "expense",
    title: "Goa dinner",
    subtitle: "Goa Trip · paid by Asha",
    href: "/dashboard/groups/group-1",
    amount: 1200,
  },
];

function stubFetch(
  results: SearchResult[] = suggestions,
  total = results.length,
) {
  const fetchMock = vi.fn<(input: RequestInfo | URL) => Promise<Response>>(
    async () =>
      new Response(
        JSON.stringify({ query: "go", total, suggestions: results }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("SearchSuggest", () => {
  beforeEach(() => {
    push.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("suggests matches for a half-typed word and opens with the arrow keys", async () => {
    const fetchMock = stubFetch();
    render(<SearchSuggest debounceMs={0} ariaLabel="Search" />);

    const input = screen.getByRole("combobox", { name: "Search" });
    fireEvent.change(input, { target: { value: "go" } });

    const option = (await screen.findByText("Goa Trip")).closest(
      '[role="option"]',
    );
    expect(option).not.toBeNull();
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/search?q=go&limit=8");
    expect(input.getAttribute("aria-expanded")).toBe("true");

    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(option?.getAttribute("aria-selected")).toBe("true");
    expect(input.getAttribute("aria-activedescendant")).toBe(
      option?.getAttribute("id"),
    );

    fireEvent.keyDown(input, { key: "Enter" });
    expect(push).toHaveBeenCalledWith("/dashboard/groups/group-1");
  });

  it("lets a click pick a suggestion", async () => {
    stubFetch();
    render(<SearchSuggest debounceMs={0} ariaLabel="Search" />);

    fireEvent.change(screen.getByRole("combobox", { name: "Search" }), {
      target: { value: "goa" },
    });

    const title = await screen.findByText("Goa dinner");
    fireEvent.click(title.closest("button") as HTMLButtonElement);

    expect(push).toHaveBeenCalledWith("/dashboard/groups/group-1");
  });

  it("shows a link to the full results when there are more matches", async () => {
    stubFetch([suggestions[0] as SearchResult], 12);
    render(<SearchSuggest debounceMs={0} ariaLabel="Search" />);

    fireEvent.change(screen.getByRole("combobox", { name: "Search" }), {
      target: { value: "go" },
    });

    expect(
      await screen.findByText(/See all 12 results for/),
    ).toBeDefined();
  });

  it("does not call the API for a blank query", () => {
    const fetchMock = stubFetch();
    render(<SearchSuggest debounceMs={0} ariaLabel="Search" />);

    fireEvent.change(screen.getByRole("combobox", { name: "Search" }), {
      target: { value: "   " },
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("prefills the query and submits to the search page", () => {
    stubFetch();
    render(
      <SearchSuggest
        initialQuery="Goa Trip"
        debounceMs={0}
        ariaLabel="Search"
      />,
    );

    const input = screen.getByRole("combobox", { name: "Search" });
    expect((input as HTMLInputElement).value).toBe("Goa Trip");
    expect(input.closest("form")?.getAttribute("action")).toBe(
      "/dashboard/search",
    );
    expect(
      (input as HTMLInputElement).closest("form")?.querySelector(
        'input[name="q"]',
      ),
    ).toBe(input);
  });
});
