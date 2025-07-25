import React, { useEffect, useState } from "react";
import { SelectInput } from "../InputHelpers";
import { getChannelsIds } from "../dataFetchers";
import { useClientProject } from "@/components/screens/providers/ClientProjectProvider";
import { SlackChannel } from "../objects";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

interface GetChannelMembersProps {
  input: {
    body: {
      channelId: string;
    };
  };
  onInputChange: (input: any) => void;
}

const GetChannelMembers: React.FC<GetChannelMembersProps> = ({
  input,
  onInputChange,
}) => {
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const { selectedRequest } = useClientProject();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const channelsData = await getChannelsIds(selectedRequest?.id);

        if (channelsData?.channels) {
          const channelsList = channelsData.channels.map((c: any) => ({
            id: c.id,
            name: c.name,
            value: c.id,
            label: c.name,
          }));
          setChannels(channelsList);
        }
      } catch (error) {
        console.error("Failed to fetch channels:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedRequest?.id]);

  if (loading || !selectedRequest) {
    return <div className="text-sm text-gray-500">Loading channels...</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <SelectInput<SlackChannel>
        label="Channel"
        value={input?.body?.channelId ?? ""}
        onChange={(value) =>
          onInputChange({
            ...input,
            body: { ...input?.body, channelId: value },
          })
        }
        options={channels}
        getOptionValue={(channel) => channel.value}
        searchKeys={['name', 'id']}
        renderOption={(channel, isSelected) => (
          <div className="flex text-black/80 items-center gap-2">
            <div>
              <div>{channel.name || channel.id}</div>
            </div>
            {isSelected && <Check className="ml-auto" />}
          </div>
        )}
        renderTrigger={(channel, placeholder) => (
          <Button variant="outline" className="w-full">
            {channel ? (
              <div className="flex items-center gap-2">
                <span>{channel.name || channel.id}</span>
              </div>
            ) : (
              placeholder
            )}
          </Button>
        )}
        placeholder="Select a channel to get members from"
      />
    </div>
  );
};

export default GetChannelMembers;
