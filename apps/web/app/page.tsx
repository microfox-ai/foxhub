import { Metadata } from "next";
import { HomePage } from "@/components/screens/home/HomePage";

export const metadata: Metadata = {
  title: "Microfox",
  description: "Small tools, clever results. MediaMake turns JSON into videos; Workers run AI jobs in the background.",
};

export default function Home() {
  return <HomePage />;
}
