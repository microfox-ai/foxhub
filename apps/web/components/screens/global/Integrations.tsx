import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { Copy, ExternalLink, Search, Plus, HelpCircle } from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface IntegrationCard {
  title: string;
  description: string;
  icon?: string;
  docsUrl?: string;
  connectUrl?: string;
  isRequestCard?: boolean;
}

const integrationCards: IntegrationCard[] = [
  {
    title: "Airtable",
    description:
      "Create flexible databases, manage records, and collaborate with team members in Airtable.",

    connectUrl: "#",
  },
  {
    title: "Amazon Affiliate",
    description: "Search Amazon, get products, add affiliate links.",

    connectUrl: "#",
  },
  {
    title: "Asana",
    description: "Plan and manage your team's work in Asana.",

    connectUrl: "#",
  },
  {
    title: "Brave Search",
    description: "Search Web, Images, Videos, News with Brave API.",

    connectUrl: "#",
  },
  {
    title: "Browser Use",
    description:
      "Enable AI to control your browser and automate tasks seamlessly.",

    connectUrl: "#",
  },
  {
    title: "Browserbase",
    description:
      "Automate browser tasks and web interactions with Browserbase API.",

    connectUrl: "#",
  },
  {
    title: "ClickHouse",
    description:
      "Fast open-source OLAP database management system for real-time analytics.",

    connectUrl: "#",
  },
];

const RequestCard = ({
  setNewRequestDialogOpen,
}: {
  setNewRequestDialogOpen: (open: boolean) => void;
}) => (
  <Card className="flex shadow-none gap-3  flex-col border-2 border-dashed border-black/80">
    <CardHeader className="flex flex-col gap-0 px-2">
      <div className="flex h-12 w-12 items-center justify-center">
        <HelpCircle className="h-8 w-8" />
      </div>
      <div>
        <CardTitle className="text-lg pl-3 font-semibold">
          New Request
        </CardTitle>
      </div>
    </CardHeader>
    <CardContent className="flex flex-1 flex-col justify-between gap-4 pt-0 px-5">
      <CardDescription className="text-gray-600">
        Request any integration we missed, and we&apos;ll work on adding!
      </CardDescription>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="ml-auto flex items-center gap-2"
          onClick={() => setNewRequestDialogOpen(true)}
        >
          Request <Plus className="h-4 w-4" />
        </Button>
      </div>
    </CardContent>
  </Card>
);

const Integrations = ({
  setNewRequestDialogOpen,
}: {
  setNewRequestDialogOpen: (open: boolean) => void;
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCards = integrationCards.filter(
    (card) =>
      card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto py-8">
      <h1 className="mb-8 text-4xl font-bold">Integrations</h1>
      <div className="mb-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search integrations by name, description or category..."
            className="w-full border-b border-gray-200 py-4 pl-12 text-base text-gray-600 placeholder:text-gray-500 focus:border-gray-400 focus:outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <RequestCard setNewRequestDialogOpen={setNewRequestDialogOpen} />
        {filteredCards.map((card, index) => (
          <Card key={index} className="flex flex-col gap-3">
            <CardHeader className="flex flex-col gap-4">
              {card.icon ? (
                <div className="h-12 w-12 overflow-hidden rounded-lg">
                  <Image
                    src={card.icon}
                    alt={`${card.title} icon`}
                    width={48}
                    height={48}
                    className="h-full w-full object-contain"
                  />
                </div>
              ) : (
                <Avatar>
                  <AvatarFallback className="bg-blue-100">
                    {card.title.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className="flex-1">
                <CardTitle className="text-lg font-semibold">
                  {card.title}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-between gap-4">
              <CardDescription className="text-gray-600">
                {card.description}
              </CardDescription>
              <div className="flex gap-2 justify-between w-full">
                {card.docsUrl && (
                  <Button variant="outline" size="sm" asChild>
                    <Link
                      href={card.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                    >
                      Docs <Copy className="h-4 w-4" />
                    </Link>
                  </Button>
                )}
                {card.connectUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="float-right ml-auto"
                  >
                    <Link
                      href={card.connectUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-self-end gap-2"
                    >
                      Add <Plus className="h-4 w-4" />
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Integrations;
