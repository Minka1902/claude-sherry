import "server-only";
import { Tiktoken } from "js-tiktoken/lite";
import o200k_base from "js-tiktoken/ranks/o200k_base";

const encoder = new Tiktoken(o200k_base);
const BINARY_PREFIX = "Binary files ";

export const countTokens = (text: string) => (text ? encoder.encode(text).length : 0);

/** Counts tokens of added lines only; context, removed lines and file headers are ignored. */
export function analyzeDiff(diff: string) {
  const added: string[] = [];
  const uncountedFiles: string[] = [];
  let inHunk = false;
  let start = 0;

  while (start < diff.length) {
    let end = diff.indexOf("\n", start);
    if (end === -1) end = diff.length;
    const first = diff.charCodeAt(start);

    if (diff.startsWith("diff --git ", start)) inHunk = false;
    else if (diff.startsWith("@@", start)) inHunk = true;
    else if (inHunk && first === 43) added.push(diff.slice(start + 1, end));
    else if (!inHunk && diff.startsWith(BINARY_PREFIX, start)) {
      const line = diff.slice(start, end);
      const b = line.lastIndexOf(" and ");
      uncountedFiles.push(line.slice(b + 5, line.length - 7).replace(/^b\//, ""));
    }
    start = end + 1;
  }

  return { tokens: countTokens(added.join("\n")), uncountedFiles };
}
