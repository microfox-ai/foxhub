'use client';

import { EditorContent, Editor } from '@tiptap/react';
import { FC } from 'react';
import '@/lib/notion/tiptap.css';

interface TiptapRendererProps {
    editor: Editor | null;
}

const TiptapRenderer: FC<TiptapRendererProps> = ({ editor }) => {
    return <EditorContent editor={editor} />;
};

export default TiptapRenderer;