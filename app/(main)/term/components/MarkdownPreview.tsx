"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

type Props = {
  text: string;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  className?: string;
};

export default function MarkdownPreview({ text, scrollRef, className }: Props) {

  const escapeHyphenLines = (src: string) =>
    src.replace(
      /^(\s*)([-=]+)\s*$/gm,
      (_, lead, hyphens) => `${lead}${hyphens[0]}\u200B${hyphens.slice(1)}`
    );

  return (
    <div 
      ref={scrollRef}
      className={className ?? "md-preview"} 
      style={{ flex: 1, minHeight: 0, height: "100%", overflow: "auto" }}
    >
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]} 
        rehypePlugins={[rehypeRaw]}
      >
        {escapeHyphenLines(text)}
      </ReactMarkdown>
    </div>
  );
}