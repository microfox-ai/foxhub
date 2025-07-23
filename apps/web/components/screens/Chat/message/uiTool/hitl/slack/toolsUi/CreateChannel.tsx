import React, { useEffect, useState } from "react";
import { StringInput, BooleanInput, MultiSelectInput } from "../InputHelpers";
import { getActiveUsersIds, getUserInfos } from '../dataFetchers';
import { useClientProject } from "@/components/screens/providers/ClientProjectProvider";

interface CreateChannelProps {
  input: {
    body: {
      name: string;
      isPrivate?: boolean;
      join?: boolean;
      userIds?: string[];
    };
  };
  onInputChange: (input: any) => void;
}

const CreateChannel: React.FC<CreateChannelProps> = ({
  input,
  onInputChange,
}) => {
  const [users, setUsers] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const { selectedRequest } = useClientProject();
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const usersData = await getActiveUsersIds(selectedRequest.id);

        if (usersData?.users) {
          const userOptions = usersData.users.map((u: any) => ({
            value: u.id,
            label: u.real_name || u.display_name || u.name || u.id,
          }));

          if (input?.body?.userIds && input?.body?.userIds?.length > 0) {
            const missingUserIds = input?.body?.userIds?.filter((id: string) => !userOptions.some(u => u.value === id));
            if (missingUserIds?.length > 0) {
              const userInfos = await getUserInfos(missingUserIds, selectedRequest.id);
              userInfos.forEach(userInfo => {
                if (userInfo) {
                  userOptions.unshift({
                    value: userInfo?.id!,
                    label: userInfo?.real_name || userInfo?.name || userInfo?.id!,
                  });
                }
              });
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
  }, [input?.body?.userIds]);

  if (loading) {
    return <div className="text-sm text-gray-500">Loading users...</div>;
  }

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
      <BooleanInput
        label="Join Channel After Creation"
        value={input?.body?.join ?? true}
        onChange={(value) =>
          onInputChange({
            ...input,
            body: { ...input.body, join: value },
          })
        }
      />
      <MultiSelectInput
        label="Initial Members (Optional)"
        values={input?.body?.userIds ?? []}
        onChange={(values) =>
          onInputChange({
            ...input,
            body: { ...input?.body, userIds: values },
          })
        }
        options={users}
        placeholder="Select users to add to the new channel"
      />
    </div>
  );
};

export default CreateChannel;
