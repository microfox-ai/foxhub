import React, { useEffect, useState } from "react";
import { MultiSelectInput, SelectInput } from "../InputHelpers";
import { getActiveUsersIds, getChannelsIds, getUserInfos, getChannelInfo } from '../dataFetchers';
import { useClientProject } from "@/components/screens/providers/ClientProjectProvider";
import { SlackChannel, SlackUser } from "../objects";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Check, CheckCircle, X } from "lucide-react";

interface AddUsersToChannelProps {
  input: {
    body: {
      channelId: string;
      userIds: string[];
    };
  };
  onInputChange: (input: any) => void;
}

const AddUsersToChannel: React.FC<AddUsersToChannelProps> = ({
  input,
  onInputChange,
}) => {
  const [users, setUsers] = useState<SlackUser[]>([]);
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const { selectedRequest } = useClientProject();

  useEffect(() => {
    if (!selectedRequest) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const [usersData, channelsData] = await Promise.all([
          getActiveUsersIds(selectedRequest.id),
          getChannelsIds(selectedRequest.id),
        ]);

        if (usersData?.users) {
          setUsers(usersData.users);
          setLoading(false);
        }

        if (channelsData?.channels) {
          const channelsList = channelsData.channels.map((c: any) => ({
            id: c.id,
            name: c.name,
            value: c.id,
            label: c.name,
          }));
          setChannels(channelsList);
        }

        if (usersData?.users) {
          if (input?.body?.userIds?.length > 0) {
            const userInfos = await getUserInfos(input.body.userIds, selectedRequest.id);
            if (userInfos?.filter(Boolean).length > 0) {
              setUsers((prev) => [...prev.filter((u) => !input.body.userIds.includes(u.id!)), ...userInfos.filter((u): u is SlackUser => u !== null)]);
            }
          }
        }

      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedRequest?.id, input?.body?.channelId]);

  if (!selectedRequest) {
    return <div className="text-sm text-gray-500">No request selected...</div>;
  }

  const selectedChannelId = channels.find(channel => channel.id === input.body.channelId)?.id;
  const setSelectedChannelId = (value: string) => {
    const selectedChannel = channels.find(channel => channel.id === value);
    if (selectedChannel) {
      onInputChange({
        ...input,
        body: { ...input.body, channelId: selectedChannel.id },
      });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {loading ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Channel</Label>
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Users to Add</Label>
            <Skeleton className="h-10 w-full" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-28" />
            </div>
          </div>
        </div>
      ) : (
        <>
          <SelectInput<SlackChannel>
            label="Channel"
            value={selectedChannelId || ""}
            onChange={setSelectedChannelId}
            options={channels}
            getOptionValue={(channel) => channel.id}
            searchKeys={['name', 'id']}
            renderOption={(channel, isSelected) => (
              <div className="flex text-black/80 items-center gap-2">
                <div>
                  <div>#{channel.name || channel.id}</div>
                </div>
                {isSelected && <Check className="ml-auto" />}
              </div>
            )}
            renderTrigger={(channel, placeholder) => (
              <Button variant="outline" className="w-full justify-start flex-nowrap">
                {channel ? (
                  <div className="flex items-center justify-start gap-2 text-black">
                    <span>#{channel.name || channel.id}</span>
                  </div>
                ) : (
                  placeholder
                )}
              </Button>
            )}
            placeholder="Select a channel"
          />
          <MultiSelectInput<SlackUser>
            label="Users to Add"
            values={users?.filter((user) => input?.body?.userIds?.includes(user.id!)) || []}
            onChange={(values) =>
              onInputChange({
                ...input,
                body: { ...input?.body, userIds: values.map(v => v.id!).filter(Boolean) },
              })
            }
            options={users || []}
            placeholder="Select users to add to the channel"
            getOptionValue={(user) => user.id!}
            searchKeys={['name', 'real_name', 'id']}
            renderOption={(user, isSelected) => (
              <div className="text-sm text-black flex flex-row items-center gap-2">
                {user?.profile?.image_original && (
                  <img
                    src={user.profile.image_original}
                    alt={user.name || user.real_name || 'Unknown User'}
                    className="w-4 h-4 rounded-full"
                  />
                )}
                <span>{user.name || user.real_name || 'Unknown User'}</span>
                {isSelected && <CheckCircle className="w-3 h-3" />}
              </div>
            )}
            renderBadge={(user, remove) => (
              <div className="text-sm text-white flex flex-row items-center gap-2 border border-neutral-400 rounded-md p-1">
                {user?.profile?.image_original && (
                  <img
                    src={user.profile.image_original}
                    alt={user.name || user.real_name || 'Unknown User'}
                    className="w-4 h-4 rounded-full"
                  />
                )}
                <span>{user.name || user.real_name || 'Unknown User'}</span>
                <div className="cursor-pointer rounded-md" onClick={() => remove()}>
                  <X className="w-3 h-3" />
                </div>
              </div>
            )}
          />
        </>
      )}
    </div>
  );
};

export default AddUsersToChannel;
