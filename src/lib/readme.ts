export type ReadmeBlock =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "unordered-list"; items: string[] }
  | { type: "ordered-list"; items: string[] }
  | { type: "code"; language: string; code: string };

function isBlank(line: string) {
  return line.trim().length === 0;
}

function isHeading(line: string) {
  return /^#{1,6}\s+/.test(line.trim());
}

function isUnorderedList(line: string) {
  return /^[-*]\s+/.test(line.trim());
}

function isOrderedList(line: string) {
  return /^\d+\.\s+/.test(line.trim());
}

function isCodeFence(line: string) {
  return line.trim().startsWith("```");
}

function isBlockBoundary(line: string) {
  return isBlank(line) || isHeading(line) || isUnorderedList(line) || isOrderedList(line) || isCodeFence(line);
}

export function parseReadmeMarkdown(markdown: string): ReadmeBlock[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReadmeBlock[] = [];
  const paragraphLines: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length === 0) {
      return;
    }

    blocks.push({
      type: "paragraph",
      text: paragraphLines.join(" ").trim(),
    });
    paragraphLines.length = 0;
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();

    if (isBlank(line)) {
      flushParagraph();
      continue;
    }

    if (isCodeFence(line)) {
      flushParagraph();

      const language = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      index += 1;

      while (index < lines.length && !isCodeFence(lines[index])) {
        codeLines.push(lines[index]);
        index += 1;
      }

      blocks.push({
        type: "code",
        language,
        code: codeLines.join("\n"),
      });
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
      });
      continue;
    }

    const unorderedMatch = trimmed.match(/^[-*]\s+(.*)$/);
    if (unorderedMatch) {
      flushParagraph();

      const items = [unorderedMatch[1].trim()];
      while (index + 1 < lines.length) {
        const nextMatch = lines[index + 1].trim().match(/^[-*]\s+(.*)$/);
        if (!nextMatch) {
          break;
        }
        items.push(nextMatch[1].trim());
        index += 1;
      }

      blocks.push({ type: "unordered-list", items });
      continue;
    }

    const orderedMatch = trimmed.match(/^\d+\.\s+(.*)$/);
    if (orderedMatch) {
      flushParagraph();

      const items = [orderedMatch[1].trim()];
      while (index + 1 < lines.length) {
        const nextMatch = lines[index + 1].trim().match(/^\d+\.\s+(.*)$/);
        if (!nextMatch) {
          break;
        }
        items.push(nextMatch[1].trim());
        index += 1;
      }

      blocks.push({ type: "ordered-list", items });
      continue;
    }

    paragraphLines.push(trimmed);

    if (index + 1 >= lines.length || isBlockBoundary(lines[index + 1])) {
      flushParagraph();
    }
  }

  flushParagraph();
  return blocks;
}
