import ProtectedPage from "@/components/auth/ProtectedPage";
import UserOnboarding from "@/components/screens/onboarding/UserOnboarding";

const OnboardingPage = () => {
  return (
    <ProtectedPage>
      <UserOnboarding />
    </ProtectedPage>
  );
};

export default OnboardingPage;
