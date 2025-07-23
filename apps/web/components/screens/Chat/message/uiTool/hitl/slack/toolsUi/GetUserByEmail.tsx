import React from "react";
import { StringInput } from "../InputHelpers";

interface GetUserByEmailProps {
  input: {
    body: {
      email: string;
    };
  };
  onInputChange: (input: any) => void;
}

const GetUserByEmail: React.FC<GetUserByEmailProps> = ({
  input,
  onInputChange,
}) => {
  return (
    <div className="flex flex-col gap-4">
      <StringInput
        label="Email Address"
        value={input.body.email}
        onChange={(value) =>
          onInputChange({
            ...input,
            body: { ...input.body, email: value },
          })
        }
        placeholder="Enter the user's email address (e.g., user@company.com)"
      />
    </div>
  );
};

export default GetUserByEmail;
