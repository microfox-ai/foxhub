import React, { useEffect, useState } from "react";
import { SelectInput, StringInput } from "../InputHelpers";
import { getActiveUsersIds, getUserInfo } from "../dataFetchers";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useClientProject } from "@/components/screens/providers/ClientProjectProvider";
import ImageUpload from "./ImageUpload";
import { Button } from "@/components/ui/button";
import { APP_BASE_URL } from "@/utils/constants/appInfo";
import { BotIdentity } from "./BotIdentity";
import { Check } from "lucide-react";
import { SlackUser } from "../objects";
import useSWR from "swr";

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
  const [users, setUsers] = useState<SlackUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBotConfig, setShowBotConfig] = useState(false);
  const { selectedRequest } = useClientProject();

  const { data: selectedUser } = useSWR<SlackUser>(
    (selectedRequest?.id && input.body.userId) ? [selectedRequest.id, 'users', input.body.userId] : null,
    async () => {
      const usersData = await getUserInfo(input.body.userId, selectedRequest.id);
      return usersData;
    },
    {
      revalidateOnFocus: false,
    }
  );

  useEffect(() => {
    if (users.length > 0) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      if (!selectedRequest) return;
      try {
        setLoading(true);
        const usersData = await getActiveUsersIds(selectedRequest.id);

        if (usersData?.users) {
          setUsers(usersData.users);
        }
      } catch (error) {
        console.error("Failed to fetch users:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [input.body.userId]);

  const selectedId = users.find(user => user.id === input.body.userId)?.id;
  const setSelectedId = (value: string) => {
    const selectedUser = users.find(user => user.id === value);
    if (selectedUser) {
      onInputChange({
        ...input,
        body: { ...input.body, userId: selectedUser.id },
      });
    }
  };

  if (!selectedRequest) {
    return <div className="text-sm text-gray-500">No request selected...</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <BotIdentity
        iconUrl={input?.body?.icon_url ?? `${APP_BASE_URL}/logo-mini-color.png`}
        username={input.body.username ?? "Microfox"}
        onIconChange={(imageUrl) =>
          onInputChange({
            ...input,
            body: { ...input.body, icon_url: imageUrl?.trim() || undefined },
          })
        }
        onUsernameChange={(value) =>
          onInputChange({
            ...input,
            body: { ...input.body, username: value },
          })
        }
      />
      {loading ? (
        <div className="h-10 bg-gray-100 animate-pulse rounded-md" />
      ) : (
        <SelectInput<SlackUser>
          value={selectedId || ""}
          onChange={setSelectedId}
          label="To:"
          options={users}
          getOptionValue={(user) => user.id || ""}
          searchKeys={['name', 'id', 'real_name']}
          renderOption={(user, isSelected) => (
            <div className="flex text-black/80 items-center gap-2">
              <div>
                <div>{user.real_name || user.name || user.id}</div>
              </div>
              {isSelected && <Check className="ml-auto" />}
            </div>
          )}
          renderTrigger={(user, placeholder) => (
            <Button variant="outline" className="w-full justify-start flex-nowrap">
              {user ? (
                <div className="flex items-center justify-start gap-2">
                  {user.id === selectedUser?.id && selectedUser?.profile?.image_original && <img src={selectedUser?.profile?.image_original} className="w-6 h-6 rounded-full" />}
                  <span>{user.real_name || user.name || user.id}</span>
                </div>
              ) : (
                placeholder
              )}
            </Button>
          )}
        />
      )}
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
    </div>
  );
};

export default MessageUser;
