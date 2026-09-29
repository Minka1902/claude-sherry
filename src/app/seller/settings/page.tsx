import ActionForm from "@/components/ActionForm";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Input from "@/components/Input";
import TextArea from "@/components/TextArea";
import { saveSellerAction } from "@/actions/seller";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unitsToCredits } from "@/lib/credits";
import { MAX_BIO_LENGTH } from "@/lib/limits";

const DEFAULTS = { bio: "", stack: [], tools: [], isActive: true, ratePer10k: 1000, sessionPrice: 4000, sessionMinutes: 60, sessionTokenCap: 100_000 };

export default async function SellerSettingsPage() {
  const userId = await requireUserId();
  const profile = (await prisma.sellerProfile.findUnique({ where: { userId } })) ?? DEFAULTS;
  const isNew = profile === DEFAULTS;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isNew ? "Become a seller" : "Seller settings"}</h1>
        {!isNew && (
          <Button href={`/sellers/${userId}`} variant="ghost">
            View profile →
          </Button>
        )}
      </div>
      <Card>
        <ActionForm action={saveSellerAction} submitLabel={isNew ? "Start selling" : "Save"} successMessage="Saved">
          <TextArea name="bio" label="Bio" rows={4} maxLength={MAX_BIO_LENGTH} defaultValue={profile.bio} placeholder="What you build, how you work, your coding agent setup…" />
          <Input name="stack" label="Stack" defaultValue={profile.stack.join(", ")} hint="Comma separated — e.g. typescript, react, postgres" />
          <Input name="tools" label="Tools" defaultValue={profile.tools.join(", ")} hint="Comma separated — e.g. claude code, cursor" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input name="rate" type="number" label="Price per 10k output tokens (credits)" min={0.01} step={0.01} defaultValue={unitsToCredits(profile.ratePer10k)} required />
            <Input name="sessionPrice" type="number" label="Session price (credits)" min={0.01} step={0.01} defaultValue={unitsToCredits(profile.sessionPrice)} required />
            <Input name="sessionMinutes" type="number" label="Session length (minutes)" min={5} step={1} defaultValue={profile.sessionMinutes} required />
            <Input name="sessionTokenCap" type="number" label="Session token cap" min={1000} step={1} defaultValue={profile.sessionTokenCap} required />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isActive" defaultChecked={profile.isActive} className="size-4 accent-accent" />
            Accepting new orders
          </label>
        </ActionForm>
      </Card>
    </div>
  );
}
