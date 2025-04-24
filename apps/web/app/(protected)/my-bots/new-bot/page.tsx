import ProtectedPage from "@/components/auth/ProtectedPage";
import AddNewBot from "@/components/screens/mybots/new-bot/AddNewBot";

export const metadata = {
  title: "Configure New Bot",
  description: "Set up your bot configuration and credentials",
};

const AddNewBotPage = () => {
  return (
    <ProtectedPage>
      <AddNewBot />
    </ProtectedPage>
  );
};

export default AddNewBotPage;
