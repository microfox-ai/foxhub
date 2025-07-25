import React, { useEffect, useState } from "react";
import { MultiSelectInput, StringInput } from "../InputHelpers";
import { getActiveUsersIds, getUserInfos } from '../dataFetchers';
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useClientProject } from "@/components/screens/providers/ClientProjectProvider";
import { Button } from "@/components/ui/button";
import ImageUpload from "./ImageUpload";
import { components, operations } from "../slack";
import { SlackUser } from "../objects";
import { CheckCircle, X } from "lucide-react";
import { APP_BASE_URL } from "@/utils/constants/appInfo";
import { Skeleton } from "@/components/ui/skeleton";
import { BotIdentity } from "./BotIdentity";

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
  const [users, setUsers] = useState<SlackUser[]>([]);
  const [loading, setLoading] = useState(true);
  const { selectedRequest } = useClientProject();

  useEffect(() => {
    if (users.length > 0) {
      setLoading(false);
      return;
    }
    const fetchData = async () => {
      try {
        setLoading(true);
        const usersData = await getActiveUsersIds(selectedRequest?.id);

        console.log("usersData", usersData);
        if (usersData?.users) {
          const userOptions = usersData.users.map((u: any) => ({
            value: u.id,
            label: u.real_name || u.display_name || u.name || u.id
          }));
          setLoading(false);

          console.log("userOptions", userOptions);
          setUsers(usersData.users);
          if (input?.body?.userIds && input?.body?.userIds?.length > 0) {
            const missingUserIds = input?.body?.userIds?.filter((id: string) => !userOptions.some(u => u.value === id));
            console.log("missingUserIds", missingUserIds);
            //if (missingUserIds?.length > 0) {
            let userInfos = await getUserInfos(userOptions?.map((u: any) => u.value) || [], selectedRequest?.id);
            // userInfos?.forEach(userInfo => {
            //   if (userInfo) {
            //     userOptions.unshift({
            //       value: userInfo?.id!,
            //       label: userInfo?.real_name || userInfo?.name || userInfo?.id!
            //     });
            //   }
            // });
            console.log("userInfos", userInfos);
            userInfos = userInfos?.filter((user) => user !== null);
            if (userInfos) {
              setUsers(userInfos);
            }
            //}
          }
          // setUsers(userOptions);
        }
      } catch (error) {
        console.error('Failed to fetch users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [input?.body?.userIds]);

  return (
    <div className="flex flex-col gap-4">
      {loading ? (
        <div className="flex flex-col gap-2">
          <Label>Users to Message</Label>
          <Skeleton className="h-10 w-full" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-28" />
          </div>
        </div>
      ) : (
        <MultiSelectInput<SlackUser>
          label="Users to Message"
          values={users?.filter((user) => input?.body?.userIds?.includes(user.id!)) || []}
          onChange={(values) =>
            onInputChange({
              ...input,
              body: { ...input?.body, userIds: values.map(v => v.id!).filter(Boolean) },
            })
          }
          options={users || []}
          placeholder="Select users to send messages to"
          getOptionValue={(user) => user.id!}
          searchKeys={['name', 'real_name', 'id']}
          renderOption={(user, isSelected) => (
            <div className="text-sm text-black flex flex-row items-center gap-2">
              {user?.profile?.image_original && <img src={user?.profile?.image_original} alt={user.name || user.real_name || 'Unknown User'} className="w-4 h-4 rounded-full" />}
              <span>{user.name || user.real_name || 'Unknown User'}</span>
              {isSelected && <CheckCircle className="w-3 h-3" />}
            </div>
          )}
          renderBadge={(user, remove) => (
            <div className="text-sm text-white flex flex-row items-center gap-2 border border-neutral-400 rounded-md p-1">
              {user?.profile?.image_original && <img src={user?.profile?.image_original} alt={user.name || user.real_name || 'Unknown User'} className="w-4 h-4 rounded-full" />}
              <span>{user.name || user.real_name || 'Unknown User'}</span>
              <div className="cursor-pointer rounded-md" onClick={() => remove()}>
                <X className="w-3 h-3" />
              </div>
            </div>
          )}
        />
      )}
      <div className="flex flex-col gap-2 mt-6">
        <BotIdentity
          iconUrl={input?.body?.icon_url ?? `${APP_BASE_URL}/logo-mini-color.png`}
          username={input.body.username || "Microfox"}
          onIconChange={(imageUrl) =>
            onInputChange({
              ...input,
              body: { ...input.body, icon_url: imageUrl || undefined },
            })
          }
          onUsernameChange={(value) =>
            onInputChange({
              ...input,
              body: { ...input.body, username: value },
            })
          }
        />
        <Textarea
          value={input?.body?.text ?? ""}
          onChange={(e) =>
            onInputChange({
              ...input,
              body: { ...input?.body, text: e.target.value },
            })
          }
          className="bg-white text-black p-2"
          placeholder="Enter your message (supports templates: {mention}, {user_name}, {user_email}, etc.)"
          rows={3}
        />
        <div className="text-xs opacity-50">
          Available template variables: {"{mention}"}, {"{user_name}"},{" "}
          {"{user_email}"}, {"{user_title}"}, {"{user_phone}"},{" "}
          {"{user_status}"}, {"{first_name}"},{" "}
          {"{last_name}"}
        </div>
      </div>
    </div>
  );
};

export default MessageUsers;
