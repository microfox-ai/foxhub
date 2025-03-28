import { Markdown } from "./markdown";


export const PrintCode = ({ code }: { code: string }) => {
    return (
        <Markdown>
            {code}
        </Markdown>
    );
};