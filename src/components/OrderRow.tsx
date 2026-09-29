import Link from "next/link";
import Avatar from "@/components/Avatar";
import CreditAmount from "@/components/CreditAmount";
import LocalTime from "@/components/LocalTime";
import StatusBadge from "@/components/StatusBadge";
import type { OrderStatus, OrderType } from "@/generated/prisma/enums";

export type OrderRowData = {
  id: string;
  type: OrderType;
  status: OrderStatus;
  held: number;
  charged: number;
  repoOwner: string;
  repoName: string;
  createdAt: Date;
  counterpart: { name: string | null; image: string | null };
};

export default function OrderRow({ order, className = "" }: { order: OrderRowData; className?: string }) {
  const closed = order.status === "COMPLETED" || order.status === "EXPIRED" || order.status === "CANCELLED";

  return (
    <Link href={`/orders/${order.id}`} className={`flex items-center gap-4 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${className}`}>
      <Avatar src={order.counterpart.image} name={order.counterpart.name} size={36} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          {order.counterpart.name} · {order.type === "PROMPT" ? "Prompt" : "Session"}
        </p>
        <p className="truncate text-sm text-zinc-500">
          {order.repoOwner}/{order.repoName} · <LocalTime value={order.createdAt} />
        </p>
      </div>
      <CreditAmount units={closed ? order.charged : order.held} className="text-sm" />
      <StatusBadge status={order.status} />
    </Link>
  );
}
