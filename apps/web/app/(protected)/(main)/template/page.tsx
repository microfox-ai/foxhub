import ProtectedPage from "@/components/auth/ProtectedPage";
import { SecretTemplates } from "@/components/screens/secretTemplates/SecretTemplates";

const ProjectsListPage = () => {
    return (
        <ProtectedPage>
            <SecretTemplates />
        </ProtectedPage>
    );
};

export default ProjectsListPage;