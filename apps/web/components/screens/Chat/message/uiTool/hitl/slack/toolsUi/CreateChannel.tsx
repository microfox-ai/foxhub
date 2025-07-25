import React, { useEffect, useState } from "react";
import { StringInput, BooleanInput, MultiSelectInput } from "../InputHelpers";
import { getActiveUsersIds, getUserInfos } from '../dataFetchers';
import { useClientProject } from "@/components/screens/providers/ClientProjectProvider";
import { SlackUser } from "../objects";
import { CheckCircle, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";

interface CreateChannelProps {
  input: {
    body: {
      name: string;
      isPrivate?: boolean;
      userIds?: string[];
    };
  };
  onInputChange: (input: any) => void;
}

const CreateChannel: React.FC<CreateChannelProps> = ({
  input,
  onInputChange,
}) => {
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

        if (usersData?.users) {
          let userInfos = await getUserInfos(
            usersData.users.map((u: any) => u.id),
            selectedRequest?.id
          );
          userInfos = userInfos?.filter((user) => user !== null);
          if (userInfos) {
            setUsers(userInfos);
          }
        }
      } catch (error) {
        console.error("Failed to fetch users:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [input?.body?.userIds]);

  return (
    <div className="flex flex-col gap-4">
      <StringInput
        label="Channel Name"
        value={input?.body?.name}
        onChange={(value) =>
          onInputChange({
            ...input,
            body: { ...input.body, name: value },
          })
        }
        placeholder="Enter channel name (without #)"
      />
      <BooleanInput
        label="Private Channel"
        value={input?.body?.isPrivate ?? false}
        onChange={(value) =>
          onInputChange({
            ...input,
            body: { ...input.body, isPrivate: value },
          })
        }
      />
      {loading ? (
        <div className="flex flex-col gap-2">
          <Label>Initial Members (Optional)</Label>
          <Skeleton className="h-10 w-full" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-28" />
          </div>
        </div>
      ) : (
        <MultiSelectInput<SlackUser>
          label="Initial Members (Optional)"
          values={users?.filter((user) => input?.body?.userIds?.includes(user.id!)) || []}
          onChange={(values) =>
            onInputChange({
              ...input,
              body: { ...input?.body, userIds: values.map(v => v.id!).filter(Boolean) },
            })
          }
          options={users || []}
          placeholder="Select users to add to the new channel"
          getOptionValue={(user) => user.id!}
          searchKeys={['name', 'real_name', 'id']}
          renderOption={(user, isSelected) => (
            <div className="text-sm text-black flex flex-row items-center gap-2">
              {user?.profile?.image_original && (
                <img
                  src={user?.profile?.image_original}
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
                  src={user?.profile?.image_original}
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
      )}
    </div>
  );
};

export default CreateChannel;
