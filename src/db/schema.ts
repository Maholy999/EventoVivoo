import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  unique,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  role: text('role', { enum: ['participant', 'organizer'] })
    .notNull()
    .default('participant'),
  name: text('name').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  type: text('type', { enum: ['taller', 'hackatón', 'conferencia', 'encuentro'] })
    .notNull()
    .default('taller'),
  description: text('description'),
  location: text('location'),
  starts_at: timestamp('starts_at').notNull(),
  ends_at: timestamp('ends_at').notNull(),
  capacity: integer('capacity').notNull(),
  status: text('status', { enum: ['draft', 'published', 'cancelled'] })
    .notNull()
    .default('draft'),
  organizer_id: uuid('organizer_id')
    .notNull()
    .references(() => users.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const enrollments = pgTable(
  'enrollments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    session_id: uuid('session_id')
      .notNull()
      .references(() => sessions.id),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id),
    status: text('status', {
      enum: ['confirmed', 'waitlisted', 'cancelled'],
    })
      .notNull()
      .default('confirmed'),
    position: integer('position'),
    enrolled_at: timestamp('enrolled_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    uniq_session_user: unique().on(table.session_id, table.user_id),
  })
);

export const attendances = pgTable('attendances', {
  id: uuid('id').defaultRandom().primaryKey(),
  enrollment_id: uuid('enrollment_id')
    .notNull()
    .references(() => enrollments.id),
  qr_token: text('qr_token').notNull().unique(),
  recorded_at: timestamp('recorded_at').defaultNow().notNull(),
});

export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  user_id: uuid('user_id')
    .notNull()
    .references(() => users.id),
  message: text('message').notNull(),
  type: text('type', {
    enum: ['promotion', 'schedule_change', 'waitlisted', 'session_cancelled'],
  }).notNull(),
  read: boolean('read').notNull().default(false),
  created_at: timestamp('created_at').defaultNow().notNull(),
  session_id: uuid('session_id').references(() => sessions.id),
});

export const audit_logs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  entity_type: text('entity_type').notNull(),
  entity_id: uuid('entity_id').notNull(),
  action: text('action').notNull(),
  changed_by: uuid('changed_by').references(() => users.id),
  previous_value: jsonb('previous_value'),
  new_value: jsonb('new_value'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const surveys = pgTable('surveys', {
  id: uuid('id').defaultRandom().primaryKey(),
  enrollment_id: uuid('enrollment_id')
    .notNull()
    .unique()
    .references(() => enrollments.id),
  rating: integer('rating').notNull(),
  comment: text('comment'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});
