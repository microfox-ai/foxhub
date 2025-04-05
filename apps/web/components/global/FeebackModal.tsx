"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Send, XIcon } from "lucide-react";

import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useLayout } from "../screens/providers/LayoutProvider";
import {
  slackBotSdk,
  SlackUsers,
  MICROFOX_LOGO,
  MySlackChannels,
} from "@/utils/services/slackBotSdk";
import { toast } from "sonner";
import dayjs from "dayjs";

const feedbackSchema = z.object({
  rating: z.enum(["1", "2", "3", "4", "5"]),
  message: z.string().optional(),
});

type FeedbackFormValues = z.infer<typeof feedbackSchema>;

const FeedbackModal = () => {
  const { isFeedbackModalOpen, setIsFeedbackModalOpen } = useLayout();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      rating: undefined,
      message: "",
    },
  });

  const getRatingEmoji = (rating: string) => {
    const emojiMap: Record<string, string> = {
      "1": "😢",
      "2": "🙁",
      "3": "😐",
      "4": "🙂",
      "5": "😍",
    };
    return emojiMap[rating] || "";
  };

  const onSubmit = async (data: FeedbackFormValues) => {
    try {
      setIsSubmitting(true);

      const channelId = MySlackChannels.microfox_feedback;

      // Format message for Slack
      const ratingEmoji = getRatingEmoji(data.rating);
      const ratingText = `Rating: ${ratingEmoji} (${data.rating}/5)`;
      const messageText = data.message
        ? `Feedback: ${data.message}`
        : "No additional feedback provided";

      // Create a more detailed message for the DM
      const finalMessage = `📬 *New Feedback Submitted*\n\n*${ratingText}*\n${messageText}\n\n_Submitted at ${dayjs().format("DD MMM YYYY, hh:mm A")}_`;

      // Send direct message to yourself
      // Replace 'subhakar' with your Slack user ID from SlackUsers object
      await slackBotSdk.sendMessage({
        channel: channelId,
        text: finalMessage,
        icon_url: MICROFOX_LOGO,
        username: "Microfox",
        unfurl_links: false,
        unfurl_media: false,
      });

      toast.success("Thank you for your feedback!");
      setIsFeedbackModalOpen(false);
    } catch (error) {
      console.error("Error sending feedback to Slack:", error);
      toast.error("Failed to submit feedback. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const emojis = [
    { value: "1", emoji: "😢", label: "Dissatisfied" },
    { value: "2", emoji: "🙁", label: "" },
    { value: "3", emoji: "😐", label: "" },
    { value: "4", emoji: "🙂", label: "" },
    { value: "5", emoji: "😍", label: "Satisfied" },
  ];

  return (
    <Dialog open={isFeedbackModalOpen} onOpenChange={setIsFeedbackModalOpen}>
      <DialogContent className="sm:max-w-md p-6 pt-8">
        <DialogClose className="absolute right-4 top-4 opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
          <XIcon className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogClose>

        <div className="mb-5">
          <h2 className="text-xl font-semibold text-center">
            Share your feedback
          </h2>
          <p className="text-center text-muted-foreground mt-2">
            Help us improve our product with your valuable feedback.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem className="space-y-4">
                  <FormControl>
                    <div className="flex justify-between">
                      {emojis.map((emoji) => (
                        <div
                          key={emoji.value}
                          className="flex flex-col items-center"
                        >
                          <button
                            type="button"
                            onClick={() => field.onChange(emoji.value)}
                            className={`w-16 h-16 flex items-center justify-center text-2xl rounded-lg transition-all ${
                              field.value === emoji.value
                                ? "bg-blue-100 border-2 border-blue-500"
                                : "bg-gray-100 hover:bg-gray-200"
                            }`}
                          >
                            {emoji.emoji}
                          </button>
                          {emoji.label && (
                            <span className="text-sm text-muted-foreground mt-2">
                              {emoji.label}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />

            <div>
              <p className="font-medium mb-2">
                Write your feedback{" "}
                <span className="text-muted-foreground text-sm">
                  (optional)
                </span>
              </p>
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="Please write here"
                        className="resize-none min-h-[160px]"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="default"
                type="submit"
                className="w-full py-5"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  "Submitting..."
                ) : (
                  <>
                    <Send className="w-2 h-2 text-white mr-2" />
                    Submit
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackModal;
