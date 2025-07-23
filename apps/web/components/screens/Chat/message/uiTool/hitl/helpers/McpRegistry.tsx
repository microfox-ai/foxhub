import React, { useState } from 'react';
import { parseMcpType } from '../../mappers/uiHitl';
import GenericMcpRenderer from './GenericMcpRenderer';
import SlackToolRenderer from '../slack/SlackToolRenderer';
import { useHitl } from '../HitlProvider';

interface McpRegistryProps {
    tool: any;
    input: any;
    metadata: any;
}

const McpRegistry: React.FC<McpRegistryProps> = ({ tool, input, metadata }) => {
    const { mcpName, toolName } = parseMcpType(tool.type);
    const [mcpInput, setMcpInput] = useState(input);
    const { mutateInput } = useHitl();
    
    // Check if this is a Slack tool
    if (mcpName === 'slack') {
        return (
            <SlackToolRenderer 
                toolName={toolName as any}
                input={mcpInput}
                onInputChange={(newInput) => {
                    setMcpInput(newInput);
                    mutateInput(newInput);
                }}
            />
        );
    }
    
    // Fall back to generic renderer
    return (
        <GenericMcpRenderer
            input={input}
            metadata={metadata}
            mcpName={mcpName}
            toolName={toolName}
        />
    );
};

export default McpRegistry;
