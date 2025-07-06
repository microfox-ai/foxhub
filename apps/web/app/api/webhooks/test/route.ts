import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server-client";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const sqsClient = new SQSClient({
      region: process.env.AGENT_AWS_REGION!,
      credentials: {
        accessKeyId: process.env.AGENT_AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AGENT_AWS_SECRET_ACCESS_KEY!,
      },
    });

    const command = new SendMessageCommand({
      QueueUrl: process.env.AGENT_SQS_QUEUE_URL!,
      MessageBody: JSON.stringify(user),
    });

    await sqsClient.send(command);

    return NextResponse.json({ message: "message triggered" });
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
