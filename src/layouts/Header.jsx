// Reusable header component for page titles
export default function Header({ title }) {
  return (
    <div className="h-14 bg-white border-b border-gray-200 flex items-center px-3 sm:px-6 shrink-0">
      <h2 className="font-bold text-gray-800 text-sm sm:text-base">{title}</h2>
    </div>
  );
}
