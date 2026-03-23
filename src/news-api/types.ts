import { z } from 'zod';

/** NewsData.io の1記事のスキーマ */
export const NewsdataArticleSchema = z.object({
  article_id: z.string(),
  title: z.string(),
  link: z.string().url(),
  pubDate: z.string().nullable(),
  source_name: z.string(),
  source_url: z.string().nullable(),
  content: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  language: z.string().nullable(),
});

/** NewsData.io の API レスポンススキーマ */
export const NewsdataResponseSchema = z.object({
  status: z.string(),
  totalResults: z.number().optional(),
  results: z.array(NewsdataArticleSchema),
  nextPage: z.string().nullable().optional(),
});

export type NewsdataArticle = z.infer<typeof NewsdataArticleSchema>;
export type NewsdataResponse = z.infer<typeof NewsdataResponseSchema>;
