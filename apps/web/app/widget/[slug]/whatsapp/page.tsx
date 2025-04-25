import WhatsappWidget from "@/components/screens/whatsapp-widget/WhatsappWidget";

const WhatsappWidgetPage = async ({
  params,
}: {
  params: Promise<{ slug: string }>;
}) => {
  const { slug } = await params;
  return <WhatsappWidget slug={slug} />;
};

export default WhatsappWidgetPage;
