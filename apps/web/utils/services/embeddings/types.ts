
import { Package } from "@/components/screens/Chat/message/types";

export interface QueryApisResult {
    id: string;
    name: string;
    package_name: string;
    base_url: string;
    endpoint_path: string;
    http_method: string;
    similarity: number;
    api_type: string;
    schema_path: string;
    created_at: string;
    updated_at: string;
    metadata: {
        package_name: string;
        function_type: "WEBHOOK" | "CRON" | "MIXED";
        openApiSchema: any;
        endpointSchema: any;
    };
}

export interface PackageDbInfo {
    id: string;
    package_name: string;
    package_title: string;
    package_path: string;
    platform_type: string;
    auth_type: string | null;
    auth_endpoint: string | null;
    webhook_endpoint: string | null;
    oauth2_scopes: string[] | null;
    description: string;
    dependencies: string[] | null;
    added_dependencies: string[] | null;
    status: string;
    documentation: string;
    icon: string;
    readme_map: any;
    constructors: any[];
    key_instructions: string | null;
    extra_info: any;
    raw_content: Package;
    file_path: string;
    github_url: string;
    updated_at: string;
}


export interface ApiMcp {
    id: number;
    name: string;
    package_name: string;
    base_url: string;
    stage: string;
    api_type: string;
    type: string;
    similarity: number;
    created_at: string;
    updated_at: string;
    openApiSchema?: any;
    metadata?: any;
    tools?: QueryApisResult[];
}
