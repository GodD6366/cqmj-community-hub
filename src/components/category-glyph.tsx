import type { PostCategory } from "@/lib/types";

interface CategoryGlyphProps {
  category: PostCategory;
}

export function CategoryGlyph({ category }: CategoryGlyphProps) {
  switch (category) {
    case "request":
      return (
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <path d="M8 18v-4a8 8 0 0 1 16 0v4" />
          <path d="M8 18v4a2 2 0 0 0 2 2h2v-8h-2a2 2 0 0 0-2 2Z" />
          <path d="M24 18v4a2 2 0 0 1-2 2h-2v-8h2a2 2 0 0 1 2 2Z" />
          <path d="M20 24v1a3 3 0 0 1-3 3h-3" />
        </svg>
      );
    case "secondhand":
      return (
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <path d="M5 7h3l2.2 12.2a2 2 0 0 0 2 1.7h8.7a2 2 0 0 0 1.9-1.4L26 11H10" />
          <path d="M13 26h.01" />
          <path d="M23 26h.01" />
          <path d="M14 15h8" />
        </svg>
      );
    case "discussion":
      return (
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <path d="M8 8h16a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-7l-6 5v-5H8a3 3 0 0 1-3-3v-8a3 3 0 0 1 3-3Z" />
          <path d="M12 15h5" />
          <path d="M21 15h.01" />
        </svg>
      );
    case "play":
      return (
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <path d="M11 12h10a7 7 0 0 1 6.6 4.7l1.4 4.1a3 3 0 0 1-5.2 2.7L21 20h-10l-2.8 3.5A3 3 0 0 1 3 20.8l1.4-4.1A7 7 0 0 1 11 12Z" />
          <path d="M11 16v4" />
          <path d="M9 18h4" />
          <path d="M21 17h.01" />
          <path d="M24 20h.01" />
        </svg>
      );
  }
}
