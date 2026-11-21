import { z } from "zod";

const questionId = z.uuid();

export const questionIdSchema = z.object({ questionId });

export const answerQuestionSchema = z.object({
  questionId,
  question: z.string().trim().min(3, "Write the question (at least 3 characters).").max(300),
  answer: z.string().trim().min(1, "Write your answer.").max(2000),
  visibility: z.enum(["public", "private"]),
});

export const mergeQuestionSchema = z.object({ sourceId: questionId, targetId: questionId });

export const setQuestionStatusSchema = z.object({
  questionId,
  status: z.enum(["open", "ignored"]),
});

export const questionNotifySchema = z.object({
  siteId: z.uuid(),
  value: z.enum(["instant", "daily", "off"]),
});

export const inboxFilterSchema = z.object({
  status: z.enum(["open", "answered", "ignored"]).catch("open"),
  sort: z.enum(["asked", "recent"]).catch("asked"),
});
