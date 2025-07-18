import { IN_DEV } from "@/utils/constants/appInfo";
import { ApiMcp } from "@/utils/services/embeddings/packageSearch";

export const LOCAL_MCP_PORTS = [4000]

export const getLocalMcpDocs = async () => {
    if (IN_DEV) {
        const promiseLocalMcps = await Promise.all(LOCAL_MCP_PORTS.map(async (port) => {
            try {
                const getLocalDocs = await fetch(
                    `http://localhost:${port}/dev/docs.json`
                );
                let localDocsData = await getLocalDocs.json();
                localDocsData = {
                    ...localDocsData,
                    info: {
                        ...localDocsData.info,
                        title: `Local ${localDocsData.info.title}`,
                    }
                }
                const localMcpData: ApiMcp = {
                    id: port*40210,
                    name: `Local MCP ${port}`,
                    package_name: `localmcp${port}`,
                    base_url: `http://localhost:${port}/dev`,
                    stage: "dev",
                    api_type: "package-sls",
                    type: "package-sls",
                    similarity: 0.99,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    openApiSchema: localDocsData,
                    metadata: {
                        docs_data: localDocsData,
                    },
                    tools: [],
                }
                return localMcpData;
            } catch (e) {
                console.error("No local MCP found on port:", port);
                return null;
            }
        }));
        return promiseLocalMcps.filter((mcp) => mcp !== null) as ApiMcp[];
    } else {
        return [];
    }
}