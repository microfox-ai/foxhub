import { Toaster } from "sonner";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div>
      {children}
      <Toaster richColors position="top-right" />
    </div>
  );
};

export default Layout;
