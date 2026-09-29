import Link from "next/link";
import Avatar from "@/components/Avatar";
import Button from "@/components/Button";
import CreditAmount from "@/components/CreditAmount";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const LINKS = [
  { href: "/", label: "Browse" },
  { href: "/orders", label: "Orders" },
  { href: "/seller/settings", label: "Sell" },
];

export default async function Header() {
  const session = await auth();
  const user = session?.user.id ? await prisma.user.findUnique({ where: { id: session.user.id }, select: { balance: true, name: true, image: true } }) : null;

  async function logout() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <Link href="/" className="font-bold">
          sherry<span className="text-accent">.</span>
        </Link>
        <nav className="flex gap-4 text-sm">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {user ? (
            <>
              <Link href="/wallet" className="text-sm font-medium">
                <CreditAmount units={user.balance} />
              </Link>
              <Avatar src={user.image} name={user.name} size={28} className="hidden sm:inline-flex" />
              <form action={logout}>
                <Button variant="ghost" size="sm">
                  Sign out
                </Button>
              </form>
            </>
          ) : (
            <Button href="/login" size="sm">
              Sign in
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
