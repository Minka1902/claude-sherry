import ActionForm from "@/components/ActionForm";
import LocalTime from "@/components/LocalTime";
import TextArea from "@/components/TextArea";
import { answerPromptAction } from "@/actions/prompts";
import { formatDuration } from "@/lib/stats";
import { MAX_NOTE_LENGTH } from "@/lib/limits";

export type PromptData = {
  id: string;
  content: string;
  submittedAt: Date;
  fromSha: string | null;
  toSha: string | null;
  answerNote: string | null;
  answerTokens: number | null;
  uncountedFiles: string[];
  answeredAt: Date | null;
  responseMs: number | null;
};

export type PromptItemProps = { prompt: PromptData; orderId: string; repoUrl: string; workBranch: string | null; canAnswer: boolean; className?: string };

export default function PromptItem({ prompt, orderId, repoUrl, workBranch, canAnswer, className = "" }: PromptItemProps) {
  return (
    <article className={`flex flex-col gap-3 ${className}`}>
      <div className="self-start rounded-xl rounded-tl-sm bg-zinc-100 p-4 dark:bg-zinc-800 sm:max-w-[85%]">
        <pre className="whitespace-pre-wrap break-words font-mono text-sm">{prompt.content}</pre>
        <LocalTime value={prompt.submittedAt} className="mt-2 block text-xs text-zinc-500" />
      </div>

      {prompt.answeredAt ? (
        <div className="self-end rounded-xl rounded-tr-sm bg-accent/10 p-4 sm:max-w-[85%]">
          <p className="text-sm font-medium">
            Delivered {prompt.answerTokens?.toLocaleString()} tokens in {formatDuration(prompt.responseMs)}
          </p>
          {prompt.fromSha && prompt.toSha && (
            <a href={`${repoUrl}/compare/${prompt.fromSha}...${prompt.toSha}`} target="_blank" rel="noreferrer" className="text-sm text-accent hover:underline">
              View diff {prompt.fromSha.slice(0, 7)}…{prompt.toSha.slice(0, 7)}
            </a>
          )}
          {prompt.answerNote && <p className="mt-2 whitespace-pre-line text-sm">{prompt.answerNote}</p>}
          {prompt.uncountedFiles.length > 0 && <p className="mt-2 text-xs text-zinc-500">Not counted (binary/too large): {prompt.uncountedFiles.join(", ")}</p>}
          <LocalTime value={prompt.answeredAt} className="mt-2 block text-xs text-zinc-500" />
        </div>
      ) : canAnswer ? (
        <div className="self-end w-full rounded-xl border border-dashed border-zinc-300 p-4 dark:border-zinc-700 sm:max-w-[85%]">
          <ActionForm action={answerPromptAction} hidden={{ promptId: prompt.id, orderId }} submitLabel="Mark done">
            <p className="text-sm text-zinc-500">
              Push your commits to <code>{workBranch}</code>, then mark done. New commits since the last delivery are tokenized.
            </p>
            <TextArea name="note" label="Note to buyer (optional)" rows={2} maxLength={MAX_NOTE_LENGTH} />
          </ActionForm>
        </div>
      ) : (
        <p className="self-end text-sm text-zinc-500">Waiting for the seller…</p>
      )}
    </article>
  );
}
