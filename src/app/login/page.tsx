import { redirect } from "next/navigation";
import Button from "@/components/Button";
import Card from "@/components/Card";
import { auth, signIn } from "@/lib/auth";

export default async function LoginPage() {
  if ((await auth())?.user) redirect("/");

  async function login() {
    "use server";
    await signIn("github", { redirectTo: "/" });
  }

  return (
    <Card className="mx-auto mt-16 max-w-sm text-center" title="Sign in">
      <p className="mb-6 text-sm text-zinc-500">Sherry uses GitHub to create order branches and give sellers access to your repo only while an order is open.</p>
      <form action={login}>
        <Button fullWidth size="lg">
          Continue with GitHub
        </Button>
      </form>
    </Card>
  );
}
