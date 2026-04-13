'use client';
import ReactMarkdown from 'react-markdown';
const proseClasses = {
    p: 'text-sm leading-relaxed text-white/90 mb-3 last:mb-0',
    ul: 'list-disc pl-5 mb-3 space-y-1.5 text-sm text-white/90',
    ol: 'list-decimal pl-5 mb-3 space-y-1.5 text-sm text-white/90',
    li: 'leading-relaxed',
    h1: 'text-lg font-semibold text-white mt-4 mb-2 first:mt-0',
    h2: 'text-base font-semibold text-white mt-4 mb-2 first:mt-0',
    h3: 'text-sm font-semibold text-white mt-3 mb-1.5 first:mt-0',
    strong: 'font-semibold text-white',
    code: 'px-1.5 py-0.5 rounded bg-white/10 text-white/95 font-mono text-xs',
    pre: 'my-3 p-3 rounded-lg bg-[#0d0d0f] border border-[#262626] overflow-x-auto',
    blockquote: 'border-l-2 border-[var(--color-primary)]/50 pl-3 my-2 text-white/80 text-sm italic',
};
export default function ChatMessageMarkdown({ children }: {
    children: string;
}) {
    return (<ReactMarkdown components={{
            p: ({ children }) => <p className={proseClasses.p}>{children}</p>,
            ul: ({ children }) => <ul className={proseClasses.ul}>{children}</ul>,
            ol: ({ children }) => <ol className={proseClasses.ol}>{children}</ol>,
            li: ({ children }) => <li className={proseClasses.li}>{children}</li>,
            h1: ({ children }) => <h1 className={proseClasses.h1}>{children}</h1>,
            h2: ({ children }) => <h2 className={proseClasses.h2}>{children}</h2>,
            h3: ({ children }) => <h3 className={proseClasses.h3}>{children}</h3>,
            strong: ({ children }) => <strong className={proseClasses.strong}>{children}</strong>,
            code: ({ className, children }) => {
                const isBlock = className?.includes('language-');
                if (isBlock)
                    return <code className="text-xs text-white/90 font-mono block">{children}</code>;
                return <code className={proseClasses.code}>{children}</code>;
            },
            pre: ({ children }) => <pre className={proseClasses.pre}>{children}</pre>,
            blockquote: ({ children }) => <blockquote className={proseClasses.blockquote}>{children}</blockquote>,
        }}>
      {children}
    </ReactMarkdown>);
}
