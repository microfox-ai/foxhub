import React, { useEffect, useState } from "react";
import { SelectInput, StringInput } from "../InputHelpers";
import { getActiveUsersIds, getUserInfo } from "../dataFetchers";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useClientProject } from "@/components/screens/providers/ClientProjectProvider";
import ImageUpload from "./ImageUpload";
import { Button } from "@/components/ui/button";

interface MessageUserProps {
  input: {
    body: {
      userId: string;
      text: string;
      username?: string;
      icon_url?: string;
    };
  };
  onInputChange: (input: any) => void;
}

const MessageUser: React.FC<MessageUserProps> = ({ input, onInputChange }) => {
  const [users, setUsers] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBotConfig, setShowBotConfig] = useState(false);
  const { selectedRequest } = useClientProject();

  useEffect(() => {
    const fetchData = async () => {
      if (!selectedRequest) return;
      try {
        setLoading(true);
        const usersData = await getActiveUsersIds(selectedRequest.id);

        if (usersData?.users) {
          const userOptions = usersData.users.map((u: any) => ({
            value: u.id,
            label: u.real_name || u.display_name || u.name || u.id,
          }));

          // If a userId is provided in the input, make sure it's in the list.
          if (input.body.userId && !userOptions.some(u => u.value === input.body.userId)) {
            try {
              const userInfo = await getUserInfo(input.body.userId, selectedRequest.id);
              if (userInfo) {
                userOptions.unshift({
                  value: userInfo.id!,
                  label: userInfo.real_name || userInfo.name || userInfo.id!
                });
              }
            } catch (error) {
              console.warn(`Failed to fetch info for user ${input.body.userId}:`, error);
            }
          }
          setUsers(userOptions);
        }
      } catch (error) {
        console.error("Failed to fetch users:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [input.body.userId]);

  if (loading || !selectedRequest) {
    return <div className="text-sm text-gray-500">Loading users...</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <SelectInput
        label="User"
        value={input.body.userId || ""}
        onChange={(value) =>
          onInputChange({
            ...input,
            body: { ...input.body, userId: value },
          })
        }
        options={users}
        placeholder="Select a user to message"
      />
      {/* selectedUserInfo is removed as per the edit hint */}
      <div className="flex flex-col gap-2">
        <Label>Message</Label>
        <Textarea
          value={input.body.text || ""}
          onChange={(e) =>
            onInputChange({
              ...input,
              body: { ...input.body, text: e.target.value },
            })
          }
          placeholder="Enter your message"
          rows={3}
        />
      </div>
      <Button variant="outline" onClick={() => setShowBotConfig(!showBotConfig)}>
        {showBotConfig ? "Hide Bot Config" : "Add Bot Config"}
      </Button>
      {showBotConfig && (
        <div className="flex flex-col gap-4 pt-4 border-t">
          <StringInput
            label="Username (optional)"
            value={input.body.username || ""}
            onChange={(value) =>
              onInputChange({
                ...input,
                body: { ...input.body, username: value },
              })
            }
            placeholder="Enter a username to override the default"
          />
          <ImageUpload
            value={input.body?.icon_url || ""}
            onImageSelect={(imageUrl) =>
              onInputChange({
                ...input,
                body: { ...input.body, icon_url: imageUrl },
              })
            }
          />
        </div>
      )}
    </div>
  );
};

export default MessageUser;
