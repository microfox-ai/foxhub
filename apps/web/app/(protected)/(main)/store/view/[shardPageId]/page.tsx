import ShardView from "@/components/screens/store/ShardView";

const ShardViewPage = async ({
  params,
}: {
  params: Promise<{ shardPageId: string }>;
}) => {
  const { shardPageId } = await params;
  return <ShardView shardPageId={shardPageId} />;
};

export default ShardViewPage;
