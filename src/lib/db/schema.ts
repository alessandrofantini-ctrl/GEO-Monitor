import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  jsonb,
  integer,
} from 'drizzle-orm/pg-core';

export const brands = pgTable('brands', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  url: text('url').notNull(),
  sector: text('sector').notNull(),
  description: text('description'),
  aliases: jsonb('aliases').$type<string[]>().default([]),
  country: text('country').default('Italy'),
  language: text('language').default('Italiano'),
  scheduleEnabled: boolean('schedule_enabled').default(false),
  scheduleFrequency: text('schedule_frequency').default('weekly'), // 'weekly' | 'monthly'
  createdAt: timestamp('created_at').defaultNow(),
  // WHY: nessun userId — tool interno senza autenticazione (ADR-0003)
});

export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  brandId: uuid('brand_id')
    .references(() => brands.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  color: text('color').notNull().default('purple'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const queries = pgTable('queries', {
  id: uuid('id').defaultRandom().primaryKey(),
  brandId: uuid('brand_id')
    .references(() => brands.id, { onDelete: 'cascade' })
    .notNull(),
  categoryId: uuid('category_id').references(() => categories.id),
  // WHY: le query sono raggruppate per categoria per filtrare i risultati
  // e mostrare pill colorate per categoria come in RankPrompt
  text: text('text').notNull(),
  active: boolean('active').default(true),
  isManual: boolean('is_manual').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export const runs = pgTable('runs', {
  id: uuid('id').defaultRandom().primaryKey(),
  brandId: uuid('brand_id')
    .references(() => brands.id, { onDelete: 'cascade' })
    .notNull(),
  llms: jsonb('llms').$type<string[]>().default([]),
  status: text('status').notNull().default('pending'), // 'pending' | 'running' | 'completed' | 'failed'
  scheduledAt: timestamp('scheduled_at'),
  triggeredBy: text('triggered_by').default('manual'), // 'manual' | 'cron'
  createdAt: timestamp('created_at').defaultNow(),
  completedAt: timestamp('completed_at'),
});

export const reports = pgTable('reports', {
  id: uuid('id').defaultRandom().primaryKey(),
  brandId: uuid('brand_id')
    .references(() => brands.id, { onDelete: 'cascade' })
    .notNull(),
  runId: uuid('run_id').references(() => runs.id),
  llm: text('llm').notNull(), // 'chatgpt' | 'claude' | 'gemini'
  queryId: uuid('query_id').references(() => queries.id).notNull(),
  queryText: text('query_text').notNull(),
  response: text('response').notNull(),
  isMentioned: boolean('is_mentioned').notNull(),
  isFirst: boolean('is_first').notNull(),
  competitors: jsonb('competitors').$type<string[]>().default([]),
  createdAt: timestamp('created_at').defaultNow(),
});

export const brandSnapshots = pgTable('brand_snapshots', {
  id: uuid('id').defaultRandom().primaryKey(),
  brandId: uuid('brand_id')
    .references(() => brands.id, { onDelete: 'cascade' })
    .notNull(),
  runId: uuid('run_id').references(() => runs.id).notNull(),
  mentionRate: integer('mention_rate').notNull(),
  firstPositionRate: integer('first_position_rate').notNull(),
  totalReports: integer('total_reports').notNull(),
  competitorCount: integer('competitor_count').notNull(),
  topCompetitor: text('top_competitor'),
  llms: jsonb('llms').$type<string[]>().default([]),
  createdAt: timestamp('created_at').defaultNow(),
});

// Type exports for use throughout the app
export type Brand = typeof brands.$inferSelect;
export type NewBrand = typeof brands.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Query = typeof queries.$inferSelect;
export type NewQuery = typeof queries.$inferInsert;
export type Run = typeof runs.$inferSelect;
export type NewRun = typeof runs.$inferInsert;
export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;
export type BrandSnapshot = typeof brandSnapshots.$inferSelect;
export type NewBrandSnapshot = typeof brandSnapshots.$inferInsert;
