import { postCategoryIconMap } from "./app-icons";
import type { PostCategory } from "@/lib/types";

interface CategoryGlyphProps {
  category: PostCategory;
}

export function CategoryGlyph({ category }: CategoryGlyphProps) {
  const Icon = postCategoryIconMap[category];
  return <Icon aria-hidden="true" />;
}
