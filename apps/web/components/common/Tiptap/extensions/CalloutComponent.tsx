'use client';

import { NodeViewContent, NodeViewWrapper } from '@tiptap/react';
import React from 'react';

export const CalloutComponent = (props: any) => {
    const { icon } = props.node.attrs;

    return (
        <NodeViewWrapper className="callout">
            <div className="icon" contentEditable={false}>{icon}</div>
            <NodeViewContent className="content" />
        </NodeViewWrapper>
    );
}; 