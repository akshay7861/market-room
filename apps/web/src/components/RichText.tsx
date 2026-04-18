import type { ReactNode } from "react";
import { formatDisplayNumberText } from "../lib/formatting";
import { ChartBlock, type ChartData } from "./ChartBlock";

type RichTextProps = {
  content: string;
  className?: string;
};

export function RichText({ content, className = "" }: RichTextProps) {
  const blocks = parseBlocks(content);

  return (
    <div className={`rich-text ${className}`.trim()}>
      {blocks.map((block, index) => {
        if (block.type === "chart") {
          return <ChartBlock key={`chart-${index}`} data={block.data} />;
        }

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
  | { type: "list"; items: string[] }
  | { type: "chart"; data: ChartData };

function parseBlocks(content: string): RichTextBlock[] {
  const { text, charts } = extractChartBlocks(content);
  const lines = cleanMarkdown(text).split("\n");
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

    if (line.startsWith("%%CHART_DATA%%")) {
      flushParagraph();
      flushList();
      try {
        const data = JSON.parse(line.slice("%%CHART_DATA%%".length)) as ChartData;
        blocks.push({ type: "chart", data });
      } catch {
        // malformed — skip
      }
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
  blocks.push(...charts.map((data) => ({ type: "chart" as const, data })));
  return blocks;
}

function extractChartBlocks(content: string): { text: string; charts: ChartData[] } {
  const marker = "%%CHART_DATA%%";
  let text = content;
  const charts: ChartData[] = [];

  while (true) {
    const markerIndex = text.indexOf(marker);
    if (markerIndex < 0) {
      break;
    }

    const jsonStart = text.indexOf("{", markerIndex + marker.length);
    if (jsonStart < 0) {
      text = `${text.slice(0, markerIndex)}${text.slice(markerIndex + marker.length)}`;
      continue;
    }

    let depth = 0;
    let inString = false;
    let escaped = false;
    let jsonEnd = -1;

    for (let index = jsonStart; index < text.length; index += 1) {
      const char = text[index];

      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        continue;
      }

      if (char === "\"") {
        inString = !inString;
        continue;
      }

      if (inString) {
        continue;
      }

      if (char === "{") {
        depth += 1;
      } else if (char === "}") {
        depth -= 1;
        if (depth === 0) {
          jsonEnd = index + 1;
          break;
        }
      }
    }

    if (jsonEnd < 0) {
      text = text.slice(0, markerIndex);
      break;
    }

    try {
      charts.push(JSON.parse(text.slice(jsonStart, jsonEnd)) as ChartData);
    } catch {
      // Keep malformed chart data out of the visible answer.
    }

    text = `${text.slice(0, markerIndex).trimEnd()}\n${text.slice(jsonEnd).trimStart()}`;
  }

  return { text, charts };
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
