import React, { useEffect, useState } from "react";
import { SelectInput } from "../InputHelpers";
import { getChannelsIds } from "../dataFetchers";
import { useClientProject } from "@/components/screens/providers/ClientProjectProvider";

interface JoinChannelProps {
  input: {
    body: {
      channelId: string;
    };
  };
  onInputChange: (input: any) => void;
}

const JoinChannel: React.FC<JoinChannelProps> = ({ input, onInputChange }) => {
  const [channels, setChannels] = useState<{ value: string; label: string }[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const { selectedRequest } = useClientProject();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const channelsData = await getChannelsIds(selectedRequest.id);

        if (channelsData?.channels) {
          setChannels(
            channelsData.channels.map((c: any) => ({
              value: c.id,
              label: c.name,
            }))
          );
        }
      } catch (error) {
        console.error("Failed to fetch channels:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="text-sm text-gray-500">Loading channels...</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <SelectInput
        label="Channel to Join"
        value={input.body.channelId}
        onChange={(value) =>
          onInputChange({
            ...input,
            body: { ...input.body, channelId: value },
          })
        }
        options={channels}
        placeholder="Select a channel to join"
      />
    </div>
  );
};

export default JoinChannel;
