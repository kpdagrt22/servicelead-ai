import Link from "next/link";

export function EmptyState({
  title,
  body,
  ctaLabel,
  ctaHref,
}: {
  title: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  return (
    <div className="card flex flex-col items-center justify-center p-10 text-center">
      <p className="text-lg font-semibold text-gray-800">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-gray-500">{body}</p>
      {ctaLabel && ctaHref && (
        <Link href={ctaHref} className="btn-primary mt-5">
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}
