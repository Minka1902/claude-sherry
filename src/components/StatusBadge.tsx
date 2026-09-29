import Badge, { type BadgeTone } from "@/components/Badge";
import type { OrderStatus } from "@/generated/prisma/enums";

const STATUS: Record<OrderStatus, { tone: BadgeTone; label: string }> = {
  PENDING: { tone: "yellow", label: "Waiting for seller" },
  ACTIVE: { tone: "blue", label: "Active" },
  COMPLETED: { tone: "green", label: "Completed" },
  CANCELLED: { tone: "neutral", label: "Cancelled" },
  EXPIRED: { tone: "red", label: "Expired" },
};

export default function StatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  return (
    <Badge tone={STATUS[status].tone} className={className}>
      {STATUS[status].label}
    </Badge>
  );
}
