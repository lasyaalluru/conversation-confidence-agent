import type { Metadata } from "next";
import { FeedbackView } from "@/components/feedback/FeedbackView";

export const metadata: Metadata = { title: "Your feedback" };

export default async function FeedbackPage({ params }: PageProps<"/feedback/[sessionId]">) {
  const { sessionId } = await params;
  return <FeedbackView sessionId={sessionId} />;
}
