import React, { useEffect, useRef } from 'react';
import katex from 'katex';
import renderMathInElement from 'katex/dist/contrib/auto-render';
import 'katex/dist/katex.min.css';

interface MathRendererProps {
  content: string;
  className?: string;
  block?: boolean;
}

export const MathRenderer: React.FC<MathRendererProps> = ({ content, className = '', block = false }) => {
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (block) {
      try {
        katex.render(content, containerRef.current, {
          displayMode: true,
          throwOnError: false,
        });
      } catch (err) {
        // Fallback to plain text if KaTeX rendering fails
        containerRef.current.innerText = content;
      }
    } else {
      try {
        const hasDelimiters = content.includes('$') || content.includes('\\(') || content.includes('\\[');
        const looksLikeRawLatex = !hasDelimiters && /\\(text|pi|frac|sqrt|times|div|cdot|pm|le|ge|neq|alpha|beta|theta|Delta|sum|int)\b/.test(content);

        if (looksLikeRawLatex) {
          katex.render(content, containerRef.current, {
            displayMode: false,
            throwOnError: false,
          });
        } else {
          // Set content as plain text (not HTML) to avoid interpreting HTML entities
          containerRef.current.textContent = content;
          // Use KaTeX's built-in delimiter detection for inline math
          renderMathInElement(containerRef.current, {
            delimiters: [
              { left: "$$", right: "$$", display: true },
              { left: "$", right: "$", display: false }
            ],
            throwOnError: false,
          });
        }
      } catch (err) {
        // Fallback to plain text if KaTeX processing fails
        containerRef.current.innerText = content;
      }
    }
  }, [content, block]);

  return <span ref={containerRef} className={className} />;
};
