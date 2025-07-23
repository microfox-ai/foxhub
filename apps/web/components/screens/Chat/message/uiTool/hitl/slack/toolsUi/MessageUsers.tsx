import React, { useEffect, useState } from "react";
import { MultiSelectInput, StringInput } from "../InputHelpers";
import { getActiveUsersIds, getUserInfos } from '../dataFetchers';
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useClientProject } from "@/components/screens/providers/ClientProjectProvider";
import { Button } from "@/components/ui/button";
import ImageUpload from "./ImageUpload";

interface MessageUsersProps {
  input: {
    body: {
      userIds: string[];
      text: string;
      username?: string;
      icon_url?: string;
    };
  };
  onInputChange: (input: any) => void;
}

const MessageUsers: React.FC<MessageUsersProps> = ({ input, onInputChange }) => {
  const [users, setUsers] = useState<{ value: string, label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBotConfig, setShowBotConfig] = useState(false);
  const { selectedRequest } = useClientProject();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const usersData = await getActiveUsersIds(selectedRequest?.id);

        if (usersData?.users) {
          const userOptions = usersData.users.map((u: any) => ({
            value: u.id,
            label: u.real_name || u.display_name || u.name || u.id
          }));

          if (input?.body?.userIds && input?.body?.userIds?.length > 0) {
            const missingUserIds = input?.body?.userIds?.filter((id: string) => !userOptions.some(u => u.value === id));
            if (missingUserIds?.length > 0) {
              const userInfos = await getUserInfos(missingUserIds, selectedRequest?.id);
              userInfos?.forEach(userInfo => {
                if (userInfo) {
                  userOptions.unshift({
                    value: userInfo?.id!,
                    label: userInfo?.real_name || userInfo?.name || userInfo?.id!
                  });
                }
              });
            }
          }
          setUsers(userOptions);
        }
      } catch (error) {
        console.error('Failed to fetch users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [input?.body?.userIds]);

  if (loading) {
    return <div className="text-sm text-gray-500">Loading users...</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <MultiSelectInput
        label="Users to Message"
        values={input?.body?.userIds ?? []}
        onChange={(values) =>
          onInputChange({
            ...input,
            body: { ...input?.body, userIds: values },
          })
        }
        options={users}
        placeholder="Select users to send messages to"
      />
      <div className="flex flex-col gap-2">
        <Label>Message Template</Label>
        <Textarea
          value={input?.body?.text ?? ""}
          onChange={(e) =>
            onInputChange({
              ...input,
              body: { ...input?.body, text: e.target.value },
            })
          }
          placeholder="Enter your message (supports templates: {mention}, {user_name}, {user_email}, etc.)"
          rows={3}
        />
        <div className="text-xs text-gray-500">
          Available template variables: {"{mention}"}, {"{user_name}"},{" "}
          {"{user_email}"}, {"{user_title}"}, {"{user_phone}"},{" "}
          {"{user_status}"}, {"{user_avatar}"}, {"{first_name}"},{" "}
          {"{last_name}"}
        </div>
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

export default MessageUsers;
