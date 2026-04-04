import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { extractFirstHttpUrl, fetchLinkPreview } from "../../utils/linkPreview";

export default function MessageLinkPreview({
  text,
  excludeUrls = [],
  disabled = false,
  className = "",
}) {
  const previewUrl = useMemo(() => {
    if (disabled) return "";
    return extractFirstHttpUrl(text, { exclude: excludeUrls });
  }, [disabled, excludeUrls, text]);

  const { data } = useQuery({
    queryKey: ["link-preview", previewUrl],
    queryFn: () => fetchLinkPreview(previewUrl),
    enabled: !!previewUrl,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });

  if (!previewUrl || !data) return null;

  const safeTitle = data.title || data.siteName || "Link";
  const safeDescription = data.description || "";
  const safeUrl = data.url || previewUrl;
  const safeSiteName = data.siteName || "";
  const hasImage = typeof data.image === "string" && !!data.image;

  return (
    <a
      href={safeUrl}
      target="_blank"
      rel="noreferrer"
      className={`mt-2 block rounded-xl border border-gray-200 bg-white/95 hover:bg-white transition-colors overflow-hidden ${className}`.trim()}
    >
      {hasImage && (
        <img
          src={data.image}
          alt={safeTitle}
          className="w-full max-h-44 object-cover border-b border-gray-200"
        />
      )}

      <div className="px-3 py-2.5">
        {safeSiteName && (
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
            {safeSiteName}
          </p>
        )}
        <p className="text-xs sm:text-sm font-semibold text-gray-800 line-clamp-2 mt-0.5">
          {safeTitle}
        </p>
        {safeDescription && (
          <p className="text-[11px] sm:text-xs text-gray-500 line-clamp-2 mt-1">
            {safeDescription}
          </p>
        )}
      </div>
    </a>
  );
}
