"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import React, { useState } from "react";

const trends = [
    { title: "AI Agents", description: "Rise of autonomous AI agents in 2024." },
    { title: "Serverless", description: "Serverless architectures are trending for scale." },
    { title: "Edge Compute", description: "Edge computing is powering real-time apps." },
    { title: "RAG", description: "Retrieval Augmented Generation in LLMs." },
    { title: "Open Source LLMs", description: "OSS LLMs are closing the gap with closed models." },
    { title: "AI Design Tools", description: "AI-powered design tools are everywhere." },
];

export default function TrendsDashboard() {
    const [search, setSearch] = useState("");
    const filteredTrends = trends.filter(
        t => t.title.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="container mx-auto py-10 px-4 max-w-5xl">
            <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Trends Dashboard</h1>
                    <p className="text-muted-foreground mt-1">See what's trending in tech, AI, and more.</p>
                </div>
                <div className="flex gap-2 items-center w-full md:w-80">
                    <Input
                        placeholder="Search trends..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className=""
                    />
                    <Button variant="outline" type="button" onClick={() => setSearch("")}>Clear</Button>
                </div>
            </div>
            <Tabs defaultValue="top" className="w-full">
                <TabsList className="mb-6">
                    <TabsTrigger value="top">Top Trends</TabsTrigger>
                    <TabsTrigger value="recent">Recent</TabsTrigger>
                </TabsList>
                <TabsContent value="top">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredTrends.map((trend, i) => (
                            <Card key={i}>
                                <CardHeader>
                                    <CardTitle>{trend.title}</CardTitle>
                                    <CardDescription>{trend.description}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-xs text-muted-foreground">#{i + 1} • Trending</div>
                                </CardContent>
                            </Card>
                        ))}
                        {filteredTrends.length === 0 && (
                            <div className="col-span-full text-center text-muted-foreground py-12">No trends found.</div>
                        )}
                    </div>
                </TabsContent>
                <TabsContent value="recent">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {trends.slice().reverse().map((trend, i) => (
                            <Card key={i}>
                                <CardHeader>
                                    <CardTitle>{trend.title}</CardTitle>
                                    <CardDescription>{trend.description}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-xs text-muted-foreground">Recent</div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
