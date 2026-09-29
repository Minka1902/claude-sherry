import { afterEach, describe, expect, it, vi } from "vitest";
import { compare } from "@/lib/github";

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

function mockFetch(...responses: Response[]) {
  const fn = vi.fn();
  for (const r of responses) fn.mockResolvedValueOnce(r);
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe("compare", () => {
  it("uses JSON patches when every file has one (single request)", async () => {
    const fetch = mockFetch(json({ status: "ahead", ahead_by: 1, files: [{ filename: "a.ts", patch: "@@ -0,0 +1 @@\n+x" }] }));
    const result = await compare("t", "o", "r", "b", "h");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ status: "ahead", aheadBy: 1, diff: "diff --git a/a.ts b/a.ts\n@@ -0,0 +1 @@\n+x", uncountedFiles: [] });
  });

  it("fetches the raw diff when a patch is missing", async () => {
    const fetch = mockFetch(json({ status: "ahead", ahead_by: 1, files: [{ filename: "big.ts" }] }), new Response("RAW", { status: 200 }));
    expect((await compare("t", "o", "r", "b", "h")).diff).toBe("RAW");
    expect(fetch.mock.calls[1][1].headers.Accept).toBe("application/vnd.github.diff");
  });

  it("falls back to JSON patches and flags files when the raw diff is too large", async () => {
    mockFetch(
      json({ status: "ahead", ahead_by: 1, files: [{ filename: "a.ts", patch: "@@\n+x" }, { filename: "huge.json" }] }),
      new Response("too large", { status: 406 }),
    );
    expect(await compare("t", "o", "r", "b", "h")).toMatchObject({ diff: "diff --git a/a.ts b/a.ts\n@@\n+x", uncountedFiles: ["huge.json"] });
  });

  it("does not fetch a diff when history diverged", async () => {
    const fetch = mockFetch(json({ status: "diverged", ahead_by: 2, files: [] }));
    expect(await compare("t", "o", "r", "b", "h")).toMatchObject({ status: "diverged", diff: "" });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
