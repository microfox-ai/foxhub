import MicrofoxWhatsappWidget from "@/components/screens/whatsapp-widget/MicrofoxWhatsappWidget";
import WhatsappWidget from "@/components/screens/whatsapp-widget/WhatsappWidget";

const WhatsappWidgetPage = async ({
  params,
}: {
  params: Promise<{ slug: string }>;
}) => {
  const { slug } = await params;
  if (slug === "microfox") {
    return <MicrofoxWhatsappWidget />;
  }
  return <WhatsappWidget slug={slug} />;
};

export default WhatsappWidgetPage;
