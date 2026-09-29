import "next-auth";

declare module "next-auth" {
  interface User {
    githubLogin?: string;
  }
  interface Session {
    user: { id: string; name?: string | null; email?: string | null; image?: string | null };
  }
}
