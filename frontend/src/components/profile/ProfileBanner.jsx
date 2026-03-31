export default function ProfileBanner({
  imageUrl,
  alt = "Profile cover",
  className = "h-28 sm:h-32",
}) {
  return (
    <div className={`relative ${className} overflow-hidden bg-red-800`}>
      {imageUrl ? (
        <>
          {/* Blurred base to make odd aspect-ratio banners look intentional */}
          <img
            src={imageUrl}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover scale-110 blur-2xl opacity-35"
          />

          <img
            src={imageUrl}
            alt={alt}
            className="pointer-events-none absolute inset-0 z-10 h-full w-full object-cover"
          />

          <div className="pointer-events-none absolute inset-0 z-20 bg-black/5" />
        </>
      ) : (
        <>
          <div className="absolute -left-8 -top-10 h-20 w-20 sm:h-28 sm:w-28 rounded-full bg-white/15 blur-sm" />
          <div className="absolute right-8 bottom-2 h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-orange-300/20 blur-sm" />
        </>
      )}

      <div className="pointer-events-none absolute inset-0 ring-1 ring-black/10" />
    </div>
  );
}
