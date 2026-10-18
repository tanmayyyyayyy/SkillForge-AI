import { Fragment } from 'react';
import type { CSSProperties, ReactElement, ReactNode } from 'react';

/**
 * Minimal, dependency-free markdown renderer for chat message bubbles.
 *
 * Supports the subset emitted by the coach engines: ATX headings (#–####),
 * bold, italic, inline code, unordered/ordered lists with nesting, block
 * quotes, and plain lines. Output is built as React elements from escaped
 * text nodes only — no dangerouslySetInnerHTML — so untrusted model output
 * can never inject markup or scripts.
 */

const INLINE_PATTERN = /(\*\*[^*]+\*\*|`[^`\n]+`|\*[^*\n]+\*)/g;

const HEADING_TAGS = ['h3', 'h4', 'h5', 'h6'] as const;

const HEADING_STYLES: Array<CSSProperties | undefined> = [
  { fontSize: '1.12rem', margin: '0.5em 0 0.35em' },
  { fontSize: '1.04rem', margin: '0.45em 0 0.3em' },
  { fontSize: '0.97rem', margin: '0.4em 0 0.25em' },
  { fontSize: '0.92rem', margin: '0.35em 0 0.2em' }
];

export function renderInline(text: string, keyBase: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const parts = text.split(INLINE_PATTERN);
  parts.forEach((part, index) => {
    if (!part) return;
    const key = `${keyBase}-${index}`;
    if (part.length > 4 && part.startsWith('**') && part.endsWith('**')) {
      nodes.push(<strong key={key}>{part.slice(2, -2)}</strong>);
    } else if (part.length > 2 && part.startsWith('`') && part.endsWith('`')) {
      nodes.push(<code key={key}>{part.slice(1, -1)}</code>);
    } else if (part.length > 2 && part.startsWith('*') && part.endsWith('*')) {
      nodes.push(<em key={key}>{part.slice(1, -1)}</em>);
    } else {
      nodes.push(<Fragment key={key}>{part}</Fragment>);
    }
  });
  return nodes;
}

interface ListMatch {
  ordered: boolean;
  indent: number;
  text: string;
}

function matchListLine(line: string): ListMatch | null {
  const unordered = /^(\s*)[-*]\s+(.*)$/.exec(line);
  if (unordered) {
    return { ordered: false, indent: unordered[1].length, text: unordered[2] };
  }
  const ordered = /^(\s*)\d+\.\s+(.*)$/.exec(line);
  if (ordered) {
    return { ordered: true, indent: ordered[1].length, text: ordered[2] };
  }
  return null;
}

/**
 * Consumes a run of list lines starting at `start` and returns the parsed
 * list element plus the index of the first line that is not part of it.
 * Nested lists (indented deeper than their parent) are parsed recursively.
 */
function parseList(lines: string[], start: number, keyBase: string): { node: ReactNode; next: number } {
  const first = matchListLine(lines[start])!;
  const baseIndent = first.indent;
  const items: ReactNode[] = [];
  let index = start;
  let itemIndex = 0;

  while (index < lines.length) {
    const match = matchListLine(lines[index]);
    if (!match || match.indent < baseIndent) break;

    if (match.indent > baseIndent) {
      const nested = parseList(lines, index, `${keyBase}-${itemIndex}-nested`);
      const last = items.length - 1;
      if (last >= 0) {
        // Attach the nested list under the preceding list item.
        const prev = items[last] as ReactElement<{ children?: ReactNode }>;
        items[last] = (
          <li key={`${keyBase}-${itemIndex - 1}`} style={{ margin: '0.1em 0' }}>
            {prev.props.children}
            {nested.node}
          </li>
        );
      } else {
        items.push(<Fragment key={`${keyBase}-${itemIndex}-n`}>{nested.node}</Fragment>);
      }
      index = nested.next;
      continue;
    }

    items.push(
      <li key={`${keyBase}-${itemIndex}`} style={{ margin: '0.1em 0' }}>
        {renderInline(match.text, `${keyBase}-${itemIndex}`)}
      </li>
    );
    itemIndex += 1;
    index += 1;
  }

  const ListTag = first.ordered ? 'ol' : 'ul';
  return {
    node: <ListTag style={{ margin: '0.25em 0 0.5em', paddingLeft: '1.4em' }}>{items}</ListTag>,
    next: index
  };
}

/**
 * Renders coach markdown into React elements. Pure and side-effect free so it
 * can be unit-tested without a DOM (via react-dom/server).
 */
export function renderChatMarkdown(markdown: string): ReactNode[] {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (line.trim() === '') {
      index += 1;
      continue;
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      const level = Math.min(heading[1].length, 4);
      const Tag = HEADING_TAGS[level - 1];
      blocks.push(
        <Tag key={`b-${index}`} style={HEADING_STYLES[level - 1]}>
          {renderInline(heading[2], `h-${index}`)}
        </Tag>
      );
      index += 1;
      continue;
    }

    if (matchListLine(line)) {
      const list = parseList(lines, index, `l-${index}`);
      blocks.push(<Fragment key={`b-${index}`}>{list.node}</Fragment>);
      index = list.next;
      continue;
    }

    const quote = /^>\s?(.*)$/.exec(line);
    if (quote) {
      blocks.push(
        <blockquote
          key={`b-${index}`}
          style={{
            margin: '0.3em 0 0.5em',
            paddingLeft: '0.7em',
            borderLeft: '3px solid var(--border-medium, #d0d0d0)',
            color: 'var(--text-muted, #666)'
          }}
        >
          {renderInline(quote[1], `q-${index}`)}
        </blockquote>
      );
      index += 1;
      continue;
    }

    blocks.push(
      <p key={`b-${index}`} style={{ margin: '0 0 0.55em' }}>
        {renderInline(line, `p-${index}`)}
      </p>
    );
    index += 1;
  }

  return blocks;
}
