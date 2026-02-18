import { pgTable, pgEnum, uuid, text, integer, timestamp, boolean, index, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { vods } from './vods';

// Transcript processing status
export const transcriptStatusEnum = pgEnum('transcript_status', [
  'pending',      // Queued for processing
  'transcribing', // Audio being transcribed
  'generating',   // Chapters being generated from transcript
  'completed',    // Ready to display
  'failed',       // Processing failed
]);

// Segment: a timestamped piece of transcript text
export interface TranscriptSegment {
  start: number;   // seconds
  end: number;     // seconds
  text: string;
}

// Chapter: AI-generated topic boundary
export interface TranscriptChapter {
  title: string;
  summary: string;
  startSeconds: number;
  endSeconds: number;
}

// VOD Transcripts
export const vodTranscripts = pgTable('vod_transcripts', {
  id: uuid('id').primaryKey().defaultRandom(),
  vodId: uuid('vod_id').references(() => vods.id, { onDelete: 'cascade' }).notNull(),
  creatorId: uuid('creator_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),

  // Status
  status: transcriptStatusEnum('status').default('pending').notNull(),
  errorMessage: text('error_message'),

  // Full transcript text (searchable)
  fullText: text('full_text'),

  // Timestamped segments for synced display
  segments: jsonb('segments').$type<TranscriptSegment[]>(),

  // AI-generated chapters
  chapters: jsonb('chapters').$type<TranscriptChapter[]>(),

  // Metadata
  language: text('language').default('en'),
  durationSeconds: integer('duration_seconds'),
  wordCount: integer('word_count'),

  // Provider tracking
  provider: text('provider'), // 'deepgram' | 'whisper' | 'xai'
  costCents: integer('cost_cents'), // Track cost in cents for monitoring

  createdAt: timestamp('created_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
}, (table) => ({
  vodIdx: index('vod_transcripts_vod_id_idx').on(table.vodId),
  creatorIdx: index('vod_transcripts_creator_id_idx').on(table.creatorId),
  statusIdx: index('vod_transcripts_status_idx').on(table.status),
}));

// Relations
export const vodTranscriptsRelations = relations(vodTranscripts, ({ one }) => ({
  vod: one(vods, {
    fields: [vodTranscripts.vodId],
    references: [vods.id],
  }),
  creator: one(users, {
    fields: [vodTranscripts.creatorId],
    references: [users.id],
  }),
}));

// Type exports
export type VodTranscript = typeof vodTranscripts.$inferSelect;
export type NewVodTranscript = typeof vodTranscripts.$inferInsert;
