"use client";
import { useEffect, useState } from "react";
import Select from "@/components/Select";
import { getBranchesAction, getReposAction } from "@/actions/repos";
import type { Repo } from "@/lib/github";

export default function RepoPicker({ repoName = "repo", branchName = "branch", className = "" }: { repoName?: string; branchName?: string; className?: string }) {
  const [repos, setRepos] = useState<Repo[] | null>(null);
  const [repo, setRepo] = useState("");
  const [branches, setBranches] = useState<string[]>([]);
  const [branch, setBranch] = useState("");
  const [error, setError] = useState<string>();

  function pickRepo(fullName: string) {
    setRepo(fullName);
    setBranches([]);
    const picked = repos?.find((r) => r.fullName === fullName);
    setBranch(picked?.defaultBranch ?? "");
    if (!picked) return;
    getBranchesAction(picked.owner, picked.name)
      .then(setBranches)
      .catch(() => setError("Couldn't load branches"));
  }

  useEffect(() => {
    getReposAction()
      .then(setRepos)
      .catch(() => setError("Couldn't load your GitHub repos"));
  }, []);

  return (
    <div className={`grid gap-3 sm:grid-cols-2 ${className}`}>
      <Select
        name={repoName}
        label="Repository"
        required
        value={repo}
        onChange={(e) => pickRepo(e.target.value)}
        placeholder={error ? "Unavailable" : repos ? "Select a repo" : "Loading…"}
        options={(repos ?? []).map((r) => ({ value: r.fullName, label: `${r.fullName}${r.private ? " 🔒" : ""}` }))}
        error={error}
        hint="Only repos you admin (needed to invite the seller)"
      />
      <Select
        name={branchName}
        label="Base branch"
        required
        value={branch}
        onChange={(e) => setBranch(e.target.value)}
        disabled={!repo}
        options={(branches.length ? branches : branch ? [branch] : []).map((b) => ({ value: b, label: b }))}
        hint="The seller works on a new branch cut from this one"
      />
    </div>
  );
}
