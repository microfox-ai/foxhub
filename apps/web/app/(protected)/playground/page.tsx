import ProtectedPage from "@/components/auth/ProtectedPage";
import { PlaygroundPage } from "@/components/screens/Chat/Playground";

export default function DashboardPage() {
  return (
    <ProtectedPage>
      <div className="grid grid-cols-6 h-screen">
        <div className="col-span-1">
        </div>
        <div className="col-span-3 h-full py-10 flex flex-col items-center justify-center">
          <PlaygroundPage />
        </div>
        <div className="col-span-2"></div>
      </div>
    </ProtectedPage>
  );
}
