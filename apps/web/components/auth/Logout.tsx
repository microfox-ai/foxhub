"use client";

import { useUser } from "@/utils/hooks/useUser";

const Logout = () => {
  const { handleLogout } = useUser();
  return (
    <div>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
};

export default Logout;
