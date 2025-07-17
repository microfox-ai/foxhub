

export const TaskPlaceholder = ({ taskId, mcpName, toolName }: { taskId: string, mcpName: string, toolName: string }) => {
    return (
        <div className="flex flex-col gap-2">
            <p>This might take a while.. will update you when done.</p>
        </div>
    )
}