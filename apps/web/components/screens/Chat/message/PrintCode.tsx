import { InternalMarkdown } from "./text/markdown";


export const PrintCode = ({ code }: { code: string }) => {
    return (
        <InternalMarkdown>
            {code}
        </InternalMarkdown>
    );
};