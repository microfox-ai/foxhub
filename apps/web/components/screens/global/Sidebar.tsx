'use client';

import { ButtonSCN } from '@/components/elements/Button';
import { BotProject, ClientRequest } from '@prisma/client';
import {
  ChevronRight,
  MessageSquare,
  PlusCircle,
  Settings
} from 'lucide-react';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';

interface BotProjectWithRequests extends BotProject {
  clientRequests: ClientRequest[];
}

export default function Sidebar({
  selectedProject,
  onSelectRequest,
  onNewRequest,
  onOpenConfig,
}: {
  selectedProject: BotProjectWithRequests;
  onSelectRequest: (request: ClientRequest) => void;
  onNewRequest: (project: BotProjectWithRequests) => void;
  onOpenConfig: (project: BotProject) => void;
}) {
  const router = useRouter();
  const params = useParams<{
    project_id?: string;
    request_id?: string;
  }>();
  const projectParamId = params?.project_id;
  const requestParamId = params?.request_id;
  const searchParams: any = useSearchParams();


  return (
    <div className="h-full flex-1 overflow-y-auto border-r">
      <div
        className={`flex cursor-pointer items-center justify-between px-4 py-2`}
      >
        <div className="flex items-center">
          <span className="truncate font-medium">{selectedProject.name}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* New Request button (passes the current selectedProject) */}
          <ButtonSCN
            variant="ghost"
            size="icon"
            onClick={(e: any) => {
              e.stopPropagation();
              onNewRequest(selectedProject); // Pass the entire selectedProject
            }}
            title="New Request"
            style={{ padding: '0.25rem', marginRight: '0.25rem' }}
          >
            <PlusCircle style={{ height: '1rem', width: '1rem' }} />
          </ButtonSCN>
          <ButtonSCN
            variant="ghost"
            size="icon"
            onClick={(e: any) => {
              e.stopPropagation();
              onOpenConfig(selectedProject); // Pass the project for config handling
            }}
            title="Project Configurations"
            style={{ padding: '0.25rem' }}
          >
            <Settings style={{ height: '1rem', width: '1rem' }} />
          </ButtonSCN>
        </div>
      </div>

      <div className="mb-2 mx-1 mt-1 space-y-1">
        {selectedProject?.clientRequests?.length > 0 ? (
          selectedProject?.clientRequests?.map((request: ClientRequest) => (
            <button
              key={request?.id}
              className={`flex cursor-pointer line-clamp-1 max-w-[27ch] items-center rounded-sm px-2 py-2 text-sm ${request?.id === requestParamId ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}`}
              onClick={() => onSelectRequest(request)}
            >
              {request.id === requestParamId ? (
                <ChevronRight
                  style={{
                    marginRight: '0.5rem',
                    height: '1rem',
                    width: '1rem',
                    color: '#fff',
                  }} />
              ) : (
                <MessageSquare
                  style={{
                    marginRight: '0.5rem',
                    height: '1rem',
                    width: '1rem',
                    color: '#4c4c4c',
                  }}
                />)}
              <span className={`flex-1 truncate ${request.id === requestParamId ? 'font-semibold' : ''
                }`}>{request.title}</span>
            </button>
          ))
        ) : (
          <div className="px-4 py-2 text-sm text-muted-foreground">
            No requests
          </div>
        )}
      </div>
    </div>
  );
}
