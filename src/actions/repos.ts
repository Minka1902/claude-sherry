"use server";
import { requireUserId } from "@/lib/auth";
import { getUserToken, listAdminRepos, listBranches } from "@/lib/github";

export async function getReposAction() {
  return listAdminRepos(await getUserToken(await requireUserId()));
}

export async function getBranchesAction(owner: string, repo: string) {
  return listBranches(await getUserToken(await requireUserId()), owner, repo);
}
