"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import useSWR from "swr";

// Interface for package data
interface PackageData {
  name: string;
  status: string;
  version: string;
  description: string;
  installs: string;
  inUse: string;
}

// Fetcher function for SWR
const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch packages: ${response.statusText}`);
  }
  return response.json();
};

const Status = () => {
  // Use SWR for data fetching
  const { data, error, isLoading } = useSWR<{ packages: PackageData[] }>(
    "/api/packages",
    fetcher,
    {
      // Refresh data every 5 minutes
      refreshInterval: 300000,
      // Revalidate on focus
      revalidateOnFocus: true,
    }
  );

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Calculate pagination values
  const packages = data?.packages || [];
  const totalItems = packages.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const currentData = packages.slice(startIndex, endIndex);

  // Pagination handlers
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToPage = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Status</h1>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-lg">Loading package data...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p>Failed to load package data. Please try again later.</p>
        </div>
      ) : (
        <>
          <Table className="border-collapse">
            <TableHeader className="bg-gray-100">
              <TableRow className="border-0">
                <TableHead className="border-0">Name</TableHead>
                <TableHead className="border-0">Status</TableHead>
                <TableHead className="border-0">Version</TableHead>
                <TableHead className="border-0">Description</TableHead>
                <TableHead className="border-0">Installs</TableHead>
                <TableHead className="border-0">In Use</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentData.map((item, index) => (
                <TableRow key={index} className="border-0">
                  <TableCell className="border-0">{item.name}</TableCell>
                  <TableCell className="border-0">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.status === "STABLE"
                          ? "bg-green-100 text-green-800"
                          : item.status === "BETA"
                            ? "bg-blue-100 text-blue-800"
                            : item.status === "ALPHA"
                              ? "bg-yellow-100 text-yellow-800"
                              : item.status === "DEPRECATED"
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {item.status}
                    </span>
                  </TableCell>
                  <TableCell className="border-0">{item.version}</TableCell>
                  <TableCell
                    className="border-0 max-w-md truncate"
                    title={item.description}
                  >
                    {item.description}
                  </TableCell>
                  <TableCell className="border-0">{item.installs}</TableCell>
                  <TableCell className="border-0">
                    {item.inUse === "-" ? (
                      <span className="text-gray-500">-</span>
                    ) : (
                      <span className="font-medium">{item.inUse}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-500">
                Showing {startIndex + 1}-{endIndex} of {totalItems} items
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>

                {/* Page numbers */}
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    // Show pages around current page
                    let pageNumber;
                    if (totalPages <= 5) {
                      pageNumber = i + 1;
                    } else if (currentPage <= 3) {
                      pageNumber = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNumber = totalPages - 4 + i;
                    } else {
                      pageNumber = currentPage - 2 + i;
                    }

                    return (
                      <Button
                        key={pageNumber}
                        variant={
                          currentPage === pageNumber ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => goToPage(pageNumber)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNumber}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Status;
