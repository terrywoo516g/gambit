'use client';

/**
 * 零依赖 Markdown 渲染器，覆盖 direct 通路常见输出：
 *  - # / ## / ### 标题
 *  - 无序列表 (-、*、+) 与有序列表 (1.)
 *  - 粗体 **x**、行内代码 `x`
 *  - ``` 代码块
 *  - 段落 + 换行
 * 不依赖 react-markdown，避免为单一用途装包。
 */

import React from 'react';

interface MiniMarkdownProps {
  content: string;
  className?: string;
}

function renderInline(text: string): React.ReactNode[] {
  // 先拆 `code`，再对普通段拆 **bold**
  const parts: React.ReactNode[] = [];
  const codeSplit = text.split(/(`[^`]+`)/g);
  codeSplit.forEach((seg, i) => {
    if (seg.startsWith('`') && seg.endsWith('`')) {
      parts.push(
        <code key={`c-${i}`} className="px-1 py-0.5 rounded bg-muted text-[0.85em] font-mono">
          {seg.slice(1, -1)}
        </code>
      );
    } else {
      const boldSplit = seg.split(/(\*\*[^*]+\*\*)/g);
      boldSplit.forEach((sub, j) => {
        if (sub.startsWith('**') && sub.endsWith('**')) {
          parts.push(<strong key={`b-${i}-${j}`}>{sub.slice(2, -2)}</strong>);
        } else if (sub) {
          parts.push(<React.Fragment key={`t-${i}-${j}`}>{sub}</React.Fragment>);
        }
      });
    }
  });
  return parts;
}

export function MiniMarkdown({ content, className }: MiniMarkdownProps) {
  const lines = content.split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 代码块
    if (line.trim().startsWith('```')) {
      const lang = line.trim().slice(3).trim();
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        buf.push(lines[i]);
        i++;
      }
      i++; // 跳过结束 ```
      blocks.push(
        <pre key={key++} className="my-2 p-3 rounded bg-muted overflow-x-auto text-xs font-mono">
          {lang && <div className="text-[10px] text-muted-foreground mb-1">{lang}</div>}
          <code>{buf.join('\n')}</code>
        </pre>
      );
      continue;
    }

    // 标题
    const h = line.match(/^(#{1,6})\s+(.+)$/);
    if (h) {
      const level = h[1].length;
      const text = h[2];
      const sizes = ['text-xl', 'text-lg', 'text-base', 'text-sm', 'text-sm', 'text-xs'];
      blocks.push(
        <div
          key={key++}
          className={`font-semibold mt-3 mb-1 ${sizes[level - 1]}`}
        >
          {renderInline(text)}
        </div>
      );
      i++;
      continue;
    }

    // 无序列表
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ''));
        i++;
      }
      blocks.push(
        <ul key={key++} className="list-disc pl-5 my-1 space-y-0.5">
          {items.map((it, j) => (
            <li key={j}>{renderInline(it)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // 有序列表
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      blocks.push(
        <ol key={key++} className="list-decimal pl-5 my-1 space-y-0.5">
          {items.map((it, j) => (
            <li key={j}>{renderInline(it)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // 空行
    if (line.trim() === '') {
      i++;
      continue;
    }

    // 段落（合并连续非空非特殊行）
    const para: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].match(/^(#{1,6})\s+/) &&
      !/^\s*[-*+]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !lines[i].trim().startsWith('```')
    ) {
      para.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={key++} className="my-1.5 leading-relaxed">
        {renderInline(para.join(' '))}
      </p>
    );
  }

  return <div className={className}>{blocks}</div>;
}
