import dynamic from 'next/dynamic';
import { FC } from 'react';
import { PlainMarkdown } from './deprecatedmarkdown';

const TiptapMarkdown = dynamic(() => import('./tiptap-markdown'), {
  ssr: false,
});

const markdownRegex =
  /(^#+\s|\*\*|__|\*|_|~~|`|\[.+\]\(.+\)|!\[.+\]\(.+\)|`{3}|(^>\s)|(^\s*[-\*]\s)|(^\s*\d+\.\s))/m;

const isMarkdown = (text: string) => {
  return markdownRegex.test(text);
};

export const InternalMarkdown: FC<{ children: string }> = ({ children }) => {
  if (isMarkdown(children)) {
    return <TiptapMarkdown>{children}</TiptapMarkdown>;
  }
  return <PlainMarkdown>{children}</PlainMarkdown>;
};
