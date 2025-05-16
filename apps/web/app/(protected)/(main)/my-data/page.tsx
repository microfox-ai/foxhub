import ProtectedPage from "@/components/auth/ProtectedPage";
import MyBots from "@/components/screens/mybots/MyBots";

const MyBotsPage = () => {
    return (
        <ProtectedPage>
            <MyBots />
        </ProtectedPage>
    );
};

export default MyBotsPage;
