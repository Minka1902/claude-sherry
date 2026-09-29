import Button from "@/components/Button";
import Input from "@/components/Input";
import SellerCard from "@/components/SellerCard";
import Tabs from "@/components/Tabs";
import { listSellers, SELLERS_PAGE_SIZE, SORTS, type SellerSort } from "@/lib/sellers";

export default async function BrowsePage({ searchParams }: { searchParams: Promise<{ tag?: string; sort?: string; page?: string }> }) {
  const { tag = "", sort, page } = await searchParams;
  const activeSort = (sort && sort in SORTS ? sort : "rating") as SellerSort;
  const pageNum = Math.max(1, Number(page) || 1);
  const sellers = await listSellers({ tag, sort: activeSort, page: pageNum });
  const href = (params: Record<string, string | number>) => `/?${new URLSearchParams({ tag, sort: activeSort, ...params } as Record<string, string>)}`;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Hire a coder by the prompt</h1>
        <p className="text-zinc-500">Sellers run your prompts in their coding agent and push the result to a branch in your repo.</p>
      </div>
      <form className="flex max-w-md gap-2">
        <Input name="tag" defaultValue={tag} placeholder="Filter by stack or tool — e.g. react, claude code" className="flex-1" />
        <input type="hidden" name="sort" value={activeSort} />
        <Button variant="secondary">Filter</Button>
      </form>
      <Tabs items={Object.entries(SORTS).map(([key, label]) => ({ key, label, href: href({ sort: key, page: 1 }) }))} active={activeSort} />
      {sellers.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sellers.map((s) => (
            <SellerCard key={s.userId} seller={s} />
          ))}
        </div>
      ) : (
        <p className="text-zinc-500">No sellers found.</p>
      )}
      <div className="flex justify-between">
        {pageNum > 1 ? <Button variant="ghost" href={href({ page: pageNum - 1 })}>← Previous</Button> : <span />}
        {sellers.length === SELLERS_PAGE_SIZE && <Button variant="ghost" href={href({ page: pageNum + 1 })}>Next →</Button>}
      </div>
    </div>
  );
}
