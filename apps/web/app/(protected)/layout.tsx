import CustomBotsHeader from '@/components/screens/global/Header'
import { Toaster } from 'sonner'
import { BotTemplateProvider } from '@/components/screens/providers/BotTemplateProvider'
const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <BotTemplateProvider>
      <main className="relative flex h-screen flex-col bg-background">
        <CustomBotsHeader />
        <Toaster position="top-right" richColors duration={3000} />
        <div className="h-16" />
        <div className="flex-1">{children}</div>
      </main>
    </BotTemplateProvider>
  )
}

export default Layout
