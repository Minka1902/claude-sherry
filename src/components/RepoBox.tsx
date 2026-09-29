import Card from "@/components/Card";
import CopyField from "@/components/CopyField";

export type RepoBoxProps = {
  repoOwner: string;
  repoName: string;
  baseBranch: string;
  workBranch: string | null;
  prNumber: number | null;
  isBuyer: boolean;
  className?: string;
};

export default function RepoBox({ repoOwner, repoName, baseBranch, workBranch, prNumber, isBuyer, className }: RepoBoxProps) {
  const repoUrl = `https://github.com/${repoOwner}/${repoName}`;

  return (
    <Card title="Repository" className={className}>
      <div className="flex flex-col gap-3 text-sm">
        <a href={repoUrl} target="_blank" rel="noreferrer" className="font-medium text-accent hover:underline">
          {repoOwner}/{repoName}
        </a>
        <p className="text-zinc-500">
          Base: <code>{baseBranch}</code>
          {workBranch && (
            <>
              {" "}
              → work branch: <code>{workBranch}</code>
            </>
          )}
        </p>
        {workBranch && <CopyField label="Clone" value={`git clone -b ${workBranch} ${repoUrl}.git`} />}
        {prNumber && (
          <a href={`${repoUrl}/pull/${prNumber}`} target="_blank" rel="noreferrer" className="text-accent hover:underline">
            Pull request #{prNumber}
          </a>
        )}
        {workBranch && (
          <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
            {isBuyer
              ? "Don't push to the work branch yourself — every new commit on it is billed as seller output."
              : "Push only to the work branch and never force-push. Accept the GitHub invite first (check your email or github.com/notifications)."}
          </p>
        )}
      </div>
    </Card>
  );
}
