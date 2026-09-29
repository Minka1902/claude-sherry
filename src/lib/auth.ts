import "server-only";
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";

const adapter = PrismaAdapter(prisma as never);

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: {
    ...adapter,
    linkAccount: (account) => adapter.linkAccount!({ ...account, access_token: account.access_token && encrypt(account.access_token) }),
  },
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    GitHub({
      authorization: { params: { scope: "read:user user:email repo" } },
      profile: (p) => ({ id: String(p.id), name: p.name ?? p.login, email: p.email, image: p.avatar_url, githubLogin: p.login }),
    }),
  ],
  callbacks: {
    session({ session, token }) {
      session.user.id = token.sub!;
      return session;
    },
  },
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      if (isNewUser || !account?.access_token || !user.id) return;
      await prisma.$transaction([
        prisma.account.update({
          where: { provider_providerAccountId: { provider: account.provider, providerAccountId: account.providerAccountId } },
          data: { access_token: encrypt(account.access_token), scope: account.scope },
        }),
        prisma.user.update({ where: { id: user.id }, data: { githubLogin: profile?.login as string, image: user.image } }),
      ]);
    },
  },
});

export async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}
