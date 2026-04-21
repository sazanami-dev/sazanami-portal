"use client";

import React from "react";
import DOMPurify from "isomorphic-dompurify";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import remarkBreaks from 'remark-breaks'

type Props = {
  text: string;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  className?: string;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
};

export default function MarkdownPreview({ text, scrollRef, className, onScroll }: Props) {

  const escapeHyphenLines = (src: string) =>
    src.replace(
      /^(\s*)([-=]+)\s*$/gm,
      (_, lead, hyphens) => `${lead}${hyphens[0]}\u200B${hyphens.slice(1)}`
    );

  const sanitized = DOMPurify.sanitize(escapeHyphenLines(text))

  return (
    <div 
      ref={scrollRef}
      className={className ?? "md-preview"} 
      onScroll={(e) => { if (onScroll) onScroll(e) }}
      style={{ flex: 1, minHeight: 0, height: "100%", overflow: "auto" }}
    >
      <ReactMarkdown 
        remarkPlugins={[remarkGfm, remarkBreaks]} 
        rehypePlugins={[rehypeRaw]}      >
        {sanitized}
      </ReactMarkdown>
    </div>
  );
}