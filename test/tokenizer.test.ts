import { describe, expect, it } from "vitest";
import { analyzeDiff, countTokens } from "@/lib/tokenizer";

const DIFF = `diff --git a/src/a.ts b/src/a.ts
index 111..222 100644
--- a/src/a.ts
+++ b/src/a.ts
@@ -1,3 +1,4 @@
 const keep = 1;
-const removed = 2;
+const added = 3;
+++i;
 const tail = 4;
\\ No newline at end of file
diff --git a/logo.png b/logo.png
new file mode 100644
Binary files /dev/null and b/logo.png differ
diff --git a/b.ts b/b.ts
--- a/b.ts
+++ b/b.ts
@@ -0,0 +1 @@
+export const b = true;
`;

describe("analyzeDiff", () => {
  it("counts only added lines, including ones that start with ++", () => {
    const { tokens, uncountedFiles } = analyzeDiff(DIFF);
    expect(tokens).toBe(countTokens(["const added = 3;", "++i;", "export const b = true;"].join("\n")));
    expect(uncountedFiles).toEqual(["logo.png"]);
  });

  it("returns zero for an empty diff", () => {
    expect(analyzeDiff("")).toEqual({ tokens: 0, uncountedFiles: [] });
  });

  it("handles JSON-style patches without file headers", () => {
    expect(analyzeDiff("diff --git a/x b/x\n@@ -1 +1 @@\n-a\n+b").tokens).toBe(countTokens("b"));
  });
});
