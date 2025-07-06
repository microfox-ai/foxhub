import { SQSEvent, SQSBatchResponse } from "aws-lambda";

/**
 * Handles a batch of SQS messages.
 * It processes each message and reports partial batch failures if any message processing fails.
 */
export const handler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  const batchItemFailures: { itemIdentifier: string }[] = [];

  for (const record of event.Records) {
    try {
      console.log(
        `Processing message with ID: ${record.messageId} and the queue url is ${process.env.AGENT_QUEUE_URL}`
      );
      // The message body is a string, often containing JSON.
      const messageBody = JSON.parse(record.body);

      // --- Your business logic for one message goes here ---
      console.log("Successfully processed message body:", messageBody);
      // For example: await processUserData(messageBody);
      // ----------------------------------------------------
    } catch (error) {
      console.error(
        `Failed to process message with ID ${record.messageId}:`,
        error
      );
      // If processing fails, add the message ID to the list of failures.
      batchItemFailures.push({
        itemIdentifier: record.messageId,
      });
    }
  }

  // Return the list of failed message IDs. SQS will retry only these messages.
  // If the list is empty, the entire batch is considered successful.
  return {
    batchItemFailures,
  };
};
