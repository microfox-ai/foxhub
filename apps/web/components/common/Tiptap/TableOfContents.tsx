'use client';

import { FC, useEffect, useState } from 'react';
import { Editor } from '@tiptap/react';

interface Heading {
    id: string;
    level: number;
    text: string;
}

interface NestedHeading extends Heading {
    children: NestedHeading[];
}

interface TableOfContentsProps {
    editor: Editor | null;
}

const TableOfContents: FC<TableOfContentsProps> = ({ editor }) => {
    const [nestedHeadings, setNestedHeadings] = useState<NestedHeading[]>([]);

    const extractHeadingsFromEditor = () => {
        if (!editor) return [];
        const headings: Heading[] = [];
        editor.state.doc.forEach((node) => {
            if (node.type.name === 'heading') {
                const id = node.attrs.id;
                const level = node.attrs.level;
                const text = node.textContent;
                if (id && text) {
                    headings.push({ id, level, text });
                }
            }
        });
        return headings;
    };

    useEffect(() => {
        if (editor) {
            const handleUpdate = () => {
                const headings = extractHeadingsFromEditor();
                setNestedHeadings(nestHeadings(headings));
            };

            editor.on('update', handleUpdate);
            handleUpdate(); // Initial extraction

            return () => {
                editor.off('update', handleUpdate);
            };
        }
    }, [editor]);

    const nestHeadings = (list: Heading[]): NestedHeading[] => {
        const tree: NestedHeading[] = [];
        const stack: NestedHeading[] = [];

        list.forEach((item) => {
            const node: NestedHeading = { ...item, children: [] };
            while (stack.length > 0) {
                const last = stack[stack.length - 1];
                if (last && last.level >= node.level) {
                    stack.pop();
                } else {
                    break;
                }
            }
            if (stack.length > 0) {
                const last = stack[stack.length - 1];
                if (last) {
                    last.children.push(node);
                }
            } else {
                tree.push(node);
            }
            stack.push(node);
        });

        return tree;
    };

    const handleScrollTo = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const renderNestedHeadings = (headings: NestedHeading[]) => {
        return (
            <ul className="space-y-2">
                {headings.map((heading) => (
                    <li key={heading.id}>
                        <a
                            onClick={() => handleScrollTo(heading.id)}
                            className="cursor-pointer hover:text-blue-500 text-sm line-clamp-2"
                        >
                            {heading.text}
                        </a>
                        {heading.children.length > 0 && (
                            <div className="ml-4">{renderNestedHeadings(heading.children)}</div>
                        )}
                    </li>
                ))}
            </ul>
        );
    };

    return (
        <div className="sticky top-24 self-start">
            <h3 className="text-lg font-semibold mb-4">On this page</h3>
            {renderNestedHeadings(nestedHeadings)}
        </div>
    );
};

export default TableOfContents; 