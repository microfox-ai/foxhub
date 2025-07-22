import React, { useEffect, useState } from "react";
import { MultiSelectInput } from "../InputHelpers";
import { getChannelsIds } from "../dataFetchers";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useClientProject } from "@/components/screens/providers/ClientProjectProvider";

interface MessageChannelsProps {
  input: {
    body: {
      channelIds: string[];
      text: string;
    };
  };
  onInputChange: (input: any) => void;
}

const MessageChannels: React.FC<MessageChannelsProps> = ({
  input,
  onInputChange,
}) => {
  const [channels, setChannels] = useState<{ value: string; label: string }[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const { selectedRequest } = useClientProject();
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const channelsData = await getChannelsIds(selectedRequest?.id);

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
      <MultiSelectInput
        label="Channels to Message"
        values={input?.body?.channelIds ?? []}
        onChange={(values) =>
          onInputChange({
            ...input,
            body: { ...input?.body, channelIds: values },
          })
        }
        options={channels}
        placeholder="Select channels to send messages to"
      />
      <div className="flex flex-col gap-2">
        <Label>Message</Label>
        <Textarea
          value={input?.body?.text ?? ""}
          onChange={(e) =>
            onInputChange({
              ...input,
              body: { ...input?.body, text: e.target.value },
            })
          }
          placeholder="Enter your message"
          rows={3}
        />
      </div>
    </div>
  );
};

export default MessageChannels;
