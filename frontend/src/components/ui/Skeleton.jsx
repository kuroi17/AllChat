import React from "react";

export default function Skeleton({
  className = "w-full h-4 rounded",
  as: Component = "div",
  style,
  ...props
}) {
  return (
    <Component
      className={`bg-gray-200/80 dark:bg-gray-700/60 animate-pulse ${className}`.trim()}
      style={style}
      aria-busy="true"
      {...props}
    />
  );
}
