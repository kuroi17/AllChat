import { ExternalLink, Globe, Instagram, Music2 } from "lucide-react";

function normalizeSocialUrl(rawValue, type) {
  const value = (rawValue || "").trim();
  if (!value) return "";

  if (/^https?:\/\//i.test(value)) return value;

  if (type === "instagram") {
    const cleaned = value
      .replace(/^@/, "")
      .replace(/^instagram\.com\//i, "")
      .replace(/^www\.instagram\.com\//i, "")
      .replace(/\/+$/, "");
    return cleaned ? `https://instagram.com/${cleaned}` : "";
  }

  if (type === "spotify") {
    const cleaned = value
      .replace(/^spotify\.com\//i, "")
      .replace(/^open\.spotify\.com\//i, "open.spotify.com/");
    return `https://${cleaned}`;
  }

  return `https://${value}`;
}

function getSocialLinks(profile) {
  const links = [
    {
      key: "instagram",
      label: "Instagram",
      icon: Instagram,
      value: profile?.instagram_url,
      color: "text-pink-600",
      bg: "bg-pink-50 border-pink-200",
      type: "instagram",
    },
    {
      key: "spotify",
      label: "Spotify",
      icon: Music2,
      value: profile?.spotify_url,
      color: "text-green-600",
      bg: "bg-green-50 border-green-200",
      type: "spotify",
    },
    {
      key: "website",
      label: "Website",
      icon: Globe,
      value: profile?.website_url,
      color: "text-sky-600",
      bg: "bg-sky-50 border-sky-200",
      type: "website",
    },
  ];

  return links
    .map((item) => ({
      ...item,
      href: normalizeSocialUrl(item.value, item.type),
    }))
    .filter((item) => item.href);
}

export default function ProfileSocialLinks({
  profile,
  title = "Social Links",
  emptyMessage = "No social links shared yet.",
}) {
  const links = getSocialLinks(profile);

  return (
    <div className="space-y-2">
      <h3 className="text-[11px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wide">
        {title}
      </h3>

      {links.length === 0 ? (
        <p className="text-sm text-gray-500 leading-relaxed">{emptyMessage}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {links.map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.key}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className={`inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-medium transition-colors hover:brightness-95 ${item.bg} ${item.color}`}
              >
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>{item.label}</span>
                <ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
