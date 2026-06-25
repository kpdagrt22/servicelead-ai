import Link from "next/link";
import type { Lead } from "@/types/database";
import { ScoreBadge, SourceBadge, StatusBadge, UrgencyBadge } from "@/components/ui/badges";
import { formatRelativeTime } from "@/lib/utils";

export function LeadRow({ lead }: { lead: Lead }) {
  return (
    <Link
      href={`/app/leads/${lead.id}`}
      className="flex items-center gap-4 border-b border-gray-100 px-4 py-3 last:border-0 hover:bg-gray-50"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-gray-900">
          {lead.customer_name || lead.customer_phone || "Unknown caller"}
        </p>
        <p className="truncate text-sm text-gray-500">
          {lead.service_needed || "Service request"}
        </p>
      </div>
      <div className="hidden items-center gap-2 sm:flex">
        <UrgencyBadge urgency={lead.urgency} />
        <ScoreBadge score={lead.lead_score} />
      </div>
      <div className="hidden w-24 md:block">
        <SourceBadge source={lead.source} />
      </div>
      <div className="w-20">
        <StatusBadge status={lead.status} />
      </div>
      <div className="w-20 text-right text-xs text-gray-400">
        {formatRelativeTime(lead.created_at)}
      </div>
    </Link>
  );
}
