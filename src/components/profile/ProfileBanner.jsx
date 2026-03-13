export default function ProfileBanner({
  imageUrl,
  alt = "Profile cover",
  className = "h-32",
}) {
  return (
    <div
      className={`relative ${className} overflow-hidden bg-linear-to-r from-red-700 via-red-600 to-orange-500`}
    >
      {imageUrl ? (
        <>
          {/* Soft blurred layer fills the area while preserving full image in front */}
          <img
            src={imageUrl}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover scale-110 blur-xl opacity-65"
          />
          <div className="absolute inset-0 bg-black/25" />

          <img
            src={imageUrl}
            alt={alt}
            className="relative z-10 h-full w-full object-contain p-1"
          />
        </>
      ) : (
        <>
          <div className="absolute -left-8 -top-10 h-28 w-28 rounded-full bg-white/15 blur-sm" />
          <div className="absolute right-8 bottom-2 h-16 w-16 rounded-full bg-orange-300/20 blur-sm" />
        </>
      )}

      <div className="absolute inset-0 ring-1 ring-black/10 pointer-events-none" />
    </div>
  );
}
