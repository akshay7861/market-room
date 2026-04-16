import type { ReactNode } from "react";
import { formatDisplayNumberText } from "../lib/formatting";

type RichTextProps = {
  content: string;
  className?: string;
};

export function RichText({ content, className = "" }: RichTextProps) {
  const blocks = parseBlocks(content);

  return (
    <div className={`rich-text ${className}`.trim()}>
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          return <h4 key={`${block.type}-${index}`}>{renderInline(block.text)}</h4>;
        }

        if (block.type === "list") {
          return (
            <ul key={`${block.type}-${index}`}>
              {block.items.map((item, itemIndex) => (
                <li key={`${block.type}-${index}-${itemIndex}`}>{renderInline(item)}</li>
              ))}
            </ul>
          );
        }

        return <p key={`${block.type}-${index}`}>{renderInline(block.text)}</p>;
      })}
    </div>
  );
}

type RichTextBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] };

function parseBlocks(content: string): RichTextBlock[] {
  const lines = cleanMarkdown(content).split("\n");
  const blocks: RichTextBlock[] = [];
  let paragraph: string[] = [];
  let listItems: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ type: "paragraph", text: paragraph.join(" ") });
      paragraph = [];
    }
  };

  const flushList = () => {
    if (listItems.length > 0) {
      blocks.push({ type: "list", items: listItems });
      listItems = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = line.match(/^#{1,4}\s+(.+)$/) || line.match(/^\*\*(.+)\*\*:?$/);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({ type: "heading", text: heading[1] || "" });
      continue;
    }

    const numberedHeading = line.match(/^\*\*(\d+\.\s+.+)\*\*:?$/) || line.match(/^(\d+\.\s+[^:]+):?$/);
    if (numberedHeading) {
      flushParagraph();
      flushList();
      blocks.push({ type: "heading", text: numberedHeading[1] || "" });
      continue;
    }

    const listItem = line.match(/^[-*•]\s+(.+)$/);
    if (listItem) {
      flushParagraph();
      listItems.push(listItem[1] || "");
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();
  return blocks;
}

function cleanMarkdown(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/^\*(\d+\.)/gm, "$1")
    .replace(/\*\*\s*$/gm, "**")
    .trim();
}

function renderInline(value: string): ReactNode[] {
  const formatted = formatLoosePrecision(value);
  const parts = formatted.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);

  return parts.map((part, index) => {
    const bold = part.match(/^\*\*([^*]+)\*\*$/);
    if (bold) {
      return <strong key={`${part}-${index}`}>{bold[1]}</strong>;
    }

    return part;
  });
}

function formatLoosePrecision(value: string): string {
  return formatDisplayNumberText(value);
}
