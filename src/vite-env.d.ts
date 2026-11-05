/// <reference types="vite/client" />

declare module 'katex/dist/contrib/auto-render' {
  interface RenderMathInElementOptions {
    delimiters?: Array<{
      left: string;
      right: string;
      display: boolean;
    }>;
    ignoredTags?: string[];
    ignoredClasses?: string[];
    errorCallback?: (msg: string, err: Error) => void;
    throwOnError?: boolean;
  }

  function renderMathInElement(
    element: HTMLElement,
    options?: RenderMathInElementOptions
  ): void;

  export default renderMathInElement;
}
