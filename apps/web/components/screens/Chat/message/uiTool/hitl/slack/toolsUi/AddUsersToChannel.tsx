import React, { useEffect, useState } from "react";
import { MultiSelectInput, SelectInput } from "../InputHelpers";
import { getActiveUsersIds, getChannelsIds, getUserInfos, getChannelInfo } from '../dataFetchers';
import { useClientProject } from "@/components/screens/providers/ClientProjectProvider";

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
  const [users, setUsers] = useState<{ value: string; label: string }[]>([]);
  const [channels, setChannels] = useState<{ value: string; label: string }[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const { selectedRequest } = useClientProject();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [usersData, channelsData] = await Promise.all([
          getActiveUsersIds(selectedRequest?.id),
          getChannelsIds(selectedRequest?.id),
        ]);

        if (usersData?.users) {
          setUsers(
            usersData.users.map((u: any) => ({
              value: u.id,
              label: u.real_name || u.display_name || u.name || u.id,
            }))
          );
        }

        if (channelsData?.channels) {
          setChannels(
            channelsData.channels.map((c: any) => ({
              value: c.id,
              label: c.name,
            }))
          );
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="text-sm text-gray-500">Loading users and channels...</div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <SelectInput
        label="Channel"
        value={input?.body?.channelId}
        onChange={(value) =>
          onInputChange({
            ...input,
            body: { ...input.body, channelId: value },
          })
        }
        options={channels}
        placeholder="Select a channel"
      />
      <MultiSelectInput
        label="Users to Add"
        values={input?.body?.userIds ?? []}
        onChange={(values) =>
          onInputChange({
            ...input,
            body: { ...input?.body, userIds: values },
          })
        }
        options={users}
        placeholder="Select users to add to the channel"
      />
    </div>
  );
};

export default AddUsersToChannel;
