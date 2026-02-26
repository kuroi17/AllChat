// Header component — will be extracted from page layouts in a later refactor
// Placeholder for the shared top navigation bar used across pages
export default function Header({ title }) {
  return (
    <div className="h-14 bg-white border-b border-gray-200 flex items-center px-6 shrink-0">
      <h2 className="font-bold text-gray-800 text-base">{title}</h2>
    </div>
  );
}
