import { prisma } from '@/prisma/prisma';
import { GithubSdk } from '@/utils/services/githubSdk';
import { ClientRequest, REQUESTSTATUS, RequestUpdate } from '@prisma/client';

// Determine new PR status based on GitHub events
export const determinePrStatus = (events: any[]): REQUESTSTATUS => {
  let lastEvent: REQUESTSTATUS = REQUESTSTATUS.UN_ASSIGNED;
  for (const e of events) {
    if (e.event === 'merged') {
      lastEvent = REQUESTSTATUS.COMPLETED;
    }
    if (e.event === 'closed') {
      lastEvent = REQUESTSTATUS.CLOSED;
    }
    if (e.event === 'review_requested') {
      lastEvent = REQUESTSTATUS.IN_REVIEW;
    }
    if (e.event === 'assigned') {
      lastEvent = REQUESTSTATUS.IN_DEVELOPMENT;
    }
    if (e.event === 'unassigned') {
      lastEvent = REQUESTSTATUS.UN_ASSIGNED;
    }
    if (e.event === 'reopened') {
      lastEvent = REQUESTSTATUS.UN_ASSIGNED;
    }
  }
  return lastEvent;
};

const eventMessage = (event: any) => {
  switch (event.event) {
    case 'committed':
      return `${event?.committer?.name || event?.actor?.login || 'Bot'} added a commit: ${event?.message || event?.body}`;
    case 'commented':
      return `${event?.body}`;
    case 'review_requested':
      return `${event?.review_requester?.login || event?.actor?.login || 'Bot'} requested a review from ${event?.requested_reviewer?.login || 'Developer'}`;
    case 'assigned':
      return `${event?.actor?.login || 'Developer'} assigned this request to ${event?.assignee?.login || 'Bot'}`;
    case 'unassigned':
      return `${event?.actor?.login || 'Developer'} unassigned this request from ${event?.assignee?.login || 'Bot'}`;
    case 'closed':
      return `${event?.author?.name || event?.actor?.login || 'Developer'} closed the Request`;
    case 'reopened':
      return `${event?.author?.name || event?.actor?.login || 'Developer'} reopened the Request`;
    case 'merged':
      return `${event?.author?.name || event?.actor?.login || 'Developer'} marked this request as Completed`;
    case 'labeled':
      return `${event?.actor?.login} labeled the Request: ${event?.label?.name}`;
    case 'unlabeled':
      return `${event?.actor?.login} unlabeled the Request: ${event?.label?.name}`;
    default:
      return `${event?.author?.name || event?.actor?.login} ${event?.event} the Request`;
  }
};

interface UpdateClientRequest extends ClientRequest {
  requestUpdates: RequestUpdate[];
}

export const updateClientRequest = async (
  clientRequest: UpdateClientRequest,
) => {
  try {
    let { prNumber, prUrl, lastUpdatedAt, requestUpdates } = clientRequest;
    const lastUpdate =
      requestUpdates?.length > 0
        ? requestUpdates?.reduce((prev, current) =>
            prev?.createdAt > current?.createdAt ? prev : current,
          )
        : null;

    prNumber = lastUpdate?.prNumber || prNumber;
    prUrl = lastUpdate?.prUrl || prUrl;

    if (!prNumber || !prUrl) {
      console.error('PR Number or PR URL is missing');
      throw new Error('PR Number or PR URL is missing');
    }

    const [owner, repo] = prUrl
      .replace('https://github.com/', '')
      .split('/')
      .slice(0, 2);
    const github = new GithubSdk({
      owner,
      repo,
      token: process.env.TMD_GITHUB_TOKEN!,
    });

    let events: any = await github.getPrEvents(prNumber, 100);
    const initTime = new Date();
    // console.log(events);
    let newEvents = lastUpdatedAt
      ? events.filter(
          (event: any) =>
            new Date(
              event?.author?.date || event?.updated_at || event?.created_at,
            ) > new Date(lastUpdatedAt),
        )
      : events;

    newEvents = newEvents.filter(
      (event: any) =>
        !(
          event?.event === 'commented' &&
          event?.body?.includes('<Not for Client>')
        ),
    );

    // if any event is merged then remove every event after that
    const mergedIndex = newEvents.findIndex(
      (event: any) => event.event === 'merged',
    );
    if (mergedIndex !== -1) {
      newEvents = newEvents.slice(0, mergedIndex + 1);
    }

    // filter out duplicate id events
    newEvents = newEvents.filter((event: any, index: number, self: any) => {
      return (
        index ===
        self.findIndex((t: any) => {
          return t.node_id === event.node_id;
        })
      );
    });
    if (newEvents.length > 0) {
      await prisma.chatUIMessage.createMany({
        data: newEvents.map((event: any) => ({
          originClientRequestId: clientRequest.id,
          userId: clientRequest.userId,
          content: eventMessage(event),
          context: 'server',
          role: 'git',
          minion: 'gitsync',
          metadata: {
            isGitComment: event.event === 'commented',
            isGitStatus: event.event === 'status',
            gitHubUrl: event.html_url,
            gitMeta: event,
          },
          createdAt: new Date(
            event?.author?.date || event?.updated_at || event?.created_at,
          ),
        })),
      });

      // if any event is merged then remove every event after that
      const mergedIndex = events.findIndex(
        (event: any) => event.event === 'merged',
      );
      if (mergedIndex !== -1) {
        events = events.slice(0, mergedIndex + 1);
      }

      const newStatus = determinePrStatus(events);
      const updatedClientRequest = await prisma.clientRequest.update({
        where: { id: clientRequest.id },
        data: { lastUpdatedAt: initTime, requestStatus: newStatus },
        include: { chatUIMessages: true },
      });
      return updatedClientRequest;
    } else {
      const chatUIMessages = await prisma.chatUIMessage.findMany({
        where: { originClientRequestId: clientRequest.id },
        orderBy: { createdAt: 'asc' },
      });
      return { ...clientRequest, chatUIMessages };
    }
  } catch (error: any) {
    console.error('Error updating PR events:', error);
    throw new Error('Error updating PR events: ', error.message);
  }
};
