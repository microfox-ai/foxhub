import { Markdown } from "./text/markdown";


export const PrintCode = ({ code }: { code: string }) => {
    return (
        <Markdown>
            {code}
        </Markdown>
    );
};