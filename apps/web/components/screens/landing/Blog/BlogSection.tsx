import { useEffect, useState } from "react";
import { IIndustryAndProjects, IProjects } from "./Data";
import { projectsData } from "./Data";
import IndustryCarousel from "./IndustryCarousel";
import useSWR from "swr";
import { type QueryDataSourceResponse } from "@microfox/notion";
import { APP_BASE_URL } from "@/utils/constants/appInfo";
import { MAIN_BLOG_DATABASE } from "./blogConstants";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export const BlogSection = ({ category }: { category?: string }) => {

    const { data, isLoading, error } = useSWR(`/api/landing/blog/articles?data_source_id=${MAIN_BLOG_DATABASE.data_source_id}&category=${category ? category : ''}`, fetcher);

    const results = data?.results as QueryDataSourceResponse["results"]

    const industryArticles = results?.map((result) => {
        if (result.object === "page" && "properties" in result) {
            const properties = result.properties as Record<string, any>;
            const title = properties?.["Doc name"]?.title[0]?.plain_text;
            const description = properties?.["Description"]?.rich_text[0]?.plain_text;
            const link = properties?.["Link"]?.url;
            const categories = properties?.["Category"]?.multi_select.map((item: any) => item.name);
            const last_edited_time = result.last_edited_time;
            const image = result.cover?.type === "external" ? result.cover.external.url : result.cover?.type === "file" ? result.cover.file.url : null;
            console.log(categories.includes(category), category, categories);
            if (category && !categories.includes(category)) {
                return null;
            }
            return {
                id: result.id,
                link: APP_BASE_URL + "/blog/" + result.id,
                title,
                description,
                categories,
                type: "article" as const,
                image_url: image,
                last_edited_time
            }
        }
        return null;
    }).filter((article) => article !== null) ?? [];

    console.log(industryArticles);

    return (
        <div className={`w-full bg-black`}>
            <IndustryCarousel
                theme={'dark'}
                industryArticles={industryArticles}
                industryName={category ? category : "Blog"}
            />
        </div>
    );
};