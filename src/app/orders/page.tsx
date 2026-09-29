import Card from "@/components/Card";
import OrderRow from "@/components/OrderRow";
import Tabs from "@/components/Tabs";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { settleIfExpired } from "@/lib/orders";

const TABS = [
  { key: "buying", label: "Buying", href: "/orders?tab=buying" },
  { key: "selling", label: "Selling", href: "/orders?tab=selling" },
];
const PERSON = { select: { name: true, image: true } };

async function load(userId: string, selling: boolean) {
  return prisma.order.findMany({
    where: selling ? { sellerId: userId } : { buyerId: userId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { buyer: PERSON, seller: PERSON },
  });
}

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const userId = await requireUserId();
  const selling = (await searchParams).tab === "selling";
  let orders = await load(userId, selling);
  const settled = await Promise.all(orders.map(settleIfExpired));
  if (settled.some(Boolean)) orders = await load(userId, selling);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Orders</h1>
      <Tabs items={TABS} active={selling ? "selling" : "buying"} />
      <Card padded={false}>
        {orders.length ? (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {orders.map((o) => (
              <OrderRow key={o.id} order={{ ...o, counterpart: selling ? o.buyer : o.seller }} />
            ))}
          </div>
        ) : (
          <p className="p-5 text-sm text-zinc-500">No orders yet.</p>
        )}
      </Card>
    </div>
  );
}
