import "server-only";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { AppError } from "@/lib/errors";

const API = "https://api.github.com";
const PAGE_SIZE = 100;
const MAX_COMPARE_FILES = 300;

export type Repo = { owner: string; name: string; fullName: string; defaultBranch: string; private: boolean };
export type CompareResult = { status: "identical" | "ahead" | "behind" | "diverged"; aheadBy: number; diff: string; uncountedFiles: string[] };

export class GitHubError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function gh(token: string, path: string, init: RequestInit & { accept?: string } = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Accept: init.accept ?? "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  if (!res.ok) throw new GitHubError(res.status, `GitHub ${init.method ?? "GET"} ${path} → ${res.status}: ${await res.text()}`);
  return res;
}

const repoPath = (owner: string, repo: string) => `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;

export async function getUserToken(userId: string) {
  const account = await prisma.account.findFirst({ where: { userId, provider: "github" }, select: { access_token: true } });
  if (!account?.access_token) throw new Error("GitHub account not linked");
  return decrypt(account.access_token);
}

export async function listAdminRepos(token: string): Promise<Repo[]> {
  const repos: Repo[] = [];
  for (let page = 1; ; page++) {
    const batch: { name: string; full_name: string; owner: { login: string }; default_branch: string; private: boolean; permissions?: { admin: boolean } }[] =
      await (await gh(token, `/user/repos?per_page=${PAGE_SIZE}&page=${page}&sort=pushed&affiliation=owner,organization_member`)).json();
    for (const r of batch) {
      if (r.permissions?.admin) repos.push({ owner: r.owner.login, name: r.name, fullName: r.full_name, defaultBranch: r.default_branch, private: r.private });
    }
    if (batch.length < PAGE_SIZE) return repos;
  }
}

export async function listBranches(token: string, owner: string, repo: string) {
  const names: string[] = [];
  for (let page = 1; ; page++) {
    const batch: { name: string }[] = await (await gh(token, `${repoPath(owner, repo)}/branches?per_page=${PAGE_SIZE}&page=${page}`)).json();
    for (const b of batch) names.push(b.name);
    if (batch.length < PAGE_SIZE) return names;
  }
}

export async function verifyRepo(token: string, owner: string, repo: string, branch: string) {
  const [info] = await Promise.all([
    gh(token, repoPath(owner, repo)).then((r) => r.json() as Promise<{ permissions?: { admin: boolean } }>),
    getBranchSha(token, owner, repo, branch),
  ]).catch((e) => {
    if (e instanceof GitHubError && e.status === 404) throw new AppError(`Repo ${owner}/${repo} or branch ${branch} not found`);
    throw e;
  });
  if (!info.permissions?.admin) throw new AppError(`You need admin rights on ${owner}/${repo} to invite a seller`);
}

export async function getBranchSha(token: string, owner: string, repo: string, branch: string) {
  const ref: { object: { sha: string } } = await (await gh(token, `${repoPath(owner, repo)}/git/ref/heads/${encodeURIComponent(branch)}`)).json();
  return ref.object.sha;
}

export async function createBranch(token: string, owner: string, repo: string, branch: string, sha: string) {
  await gh(token, `${repoPath(owner, repo)}/git/refs`, { method: "POST", body: JSON.stringify({ ref: `refs/heads/${branch}`, sha }) });
}

/** Returns the invitation id, or null when the user already has access (204). */
export async function inviteCollaborator(token: string, owner: string, repo: string, login: string) {
  const res = await gh(token, `${repoPath(owner, repo)}/collaborators/${encodeURIComponent(login)}`, { method: "PUT", body: JSON.stringify({ permission: "push" }) });
  return res.status === 201 ? ((await res.json()) as { id: number }).id : null;
}

export async function revokeAccess(token: string, owner: string, repo: string, login: string, inviteId: number | null) {
  const ignoreMissing = (e: unknown) => {
    if (!(e instanceof GitHubError && e.status === 404)) throw e;
  };
  await Promise.all([
    inviteId ? gh(token, `${repoPath(owner, repo)}/invitations/${inviteId}`, { method: "DELETE" }).catch(ignoreMissing) : null,
    gh(token, `${repoPath(owner, repo)}/collaborators/${encodeURIComponent(login)}`, { method: "DELETE" }).catch(ignoreMissing),
  ]);
}

/** Compare JSON lists at most 300 files and omits patches of binary/large files; the raw diff is fetched only then. */
export async function compare(token: string, owner: string, repo: string, base: string, head: string): Promise<CompareResult> {
  const path = `${repoPath(owner, repo)}/compare/${base}...${head}`;
  const meta: { status: CompareResult["status"]; ahead_by: number; files?: { filename: string; patch?: string }[] } = await (
    await gh(token, `${path}?per_page=1`)
  ).json();
  const result = { status: meta.status, aheadBy: meta.ahead_by, diff: "", uncountedFiles: [] as string[] };
  if (meta.status !== "ahead") return result;

  const files = meta.files ?? [];
  if (files.length >= MAX_COMPARE_FILES || files.some((f) => !f.patch)) {
    try {
      result.diff = await (await gh(token, path, { accept: "application/vnd.github.diff" })).text();
      return result;
    } catch (e) {
      if (!(e instanceof GitHubError && (e.status === 406 || e.status === 422))) throw e;
    }
  }

  const patches: string[] = [];
  for (const f of files) {
    if (f.patch) patches.push(`diff --git a/${f.filename} b/${f.filename}\n${f.patch}`);
    else result.uncountedFiles.push(f.filename);
  }
  result.diff = patches.join("\n");
  return result;
}

export async function openPullRequest(token: string, owner: string, repo: string, head: string, base: string, title: string, body: string) {
  const pr: { number: number } = await (
    await gh(token, `${repoPath(owner, repo)}/pulls`, { method: "POST", body: JSON.stringify({ head, base, title, body }) })
  ).json();
  return pr.number;
}
