import ShardEdit from "@/components/screens/store/ShardEdit";

const ShardEditPage = async ({
  params,
}: {
  params: Promise<{ shardPageId: string }>;
}) => {
  const { shardPageId } = await params;
  return <ShardEdit shardPageId={shardPageId} />;
};

export default ShardEditPage;
