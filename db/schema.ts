// db/schema.ts
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  jsonb,
  unique,
} from 'drizzle-orm/pg-core'

// ==============================
// enum 定義
// ==============================

export const userRoleEnum = pgEnum('user_role', [
  'admin',
  'developer',
  'manager',
  'member',
  'guest',
])

export const userStatusEnum = pgEnum('user_status', [
  'pending',
  'active',
  'renewing',
])

export const agreementTypeEnum = pgEnum('agreement_type', [
  'terms_of_service',
  'tech_train',
])

export const identityProviderEnum = pgEnum('identity_provider', [
  'discord',
  'github',
])

// ==============================
// public.users（アプリ側）
// ==============================
//
// 注意:
// - auth.users(id) への FK は、手書き migration SQL で貼る
//
export const users = pgTable('users', {
  // auth.users.id と 1:1 で対応する PK
  id: uuid('id').primaryKey(),

  role: userRoleEnum('role').notNull().default('guest'),
  email: text('email').notNull(),

  studentId: varchar('student_id', { length: 255 }),
  className: varchar('class_name', { length: 255 }),
  attendanceNumber: integer('attendance_number'),

  name: varchar('name', { length: 255 }).notNull(),
  nameKana: varchar('name_kana', { length: 255 }).notNull(),

  expectedGraduationYear: integer('expected_graduation_year'),

  status: userStatusEnum('status').notNull().default('pending'),

  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),

  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

// ==============================
// user_agreements
// ==============================

export const userAgreements = pgTable('user_agreements', {
  id: uuid('id').primaryKey(),

  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  agreementType: agreementTypeEnum('agreement_type').notNull(),

  agreedAt: timestamp('agreed_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

// ==============================
// user_identities
// ==============================

export const userIdentities = pgTable(
  'user_identities',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: identityProviderEnum('provider').notNull(),
    providerUserId: varchar('provider_user_id', { length: 255 }).notNull(),
    username: varchar('username', { length: 255 }).notNull(),
    isServerJoined: boolean('is_server_joined').notNull().default(false),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userProviderUnique: unique('user_identities_user_id_provider_key').on(
      table.userId,
      table.provider
    ),
  })
)

// ==============================
// user_profiles
// ==============================

export const userProfiles = pgTable('user_profiles', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),

  bio: text('bio'),
  avatarUrl: varchar('avatar_url', { length: 1024 }),
})

// ==============================
// terms
// ==============================

export const terms = pgTable('terms', {
  id: uuid('id').primaryKey(),

  content: text('content').notNull(),
  version: integer('version').notNull(),

  // onDelete: set null にするなら nullable にする必要がある
  updatedBy: uuid('updated_by')
    .references(() => users.id, { onDelete: 'set null' }),

  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

// ==============================
// audit_logs
// ==============================

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey(),

  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'set null' }),

  action: varchar('action', { length: 255 }).notNull(),
  targetTable: varchar('target_table', { length: 255 }).notNull(),
  targetId: uuid('target_id'),

  details: jsonb('details'),

  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

// ==============================
// short_links
// ==============================
//
// namespace:
//   公式リンク → '_s'
//   ユーザーリンク → users.student_id の値
// (namespace, slug) で一意制約を設ける

export const shortLinks = pgTable(
  'short_links',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    namespace: varchar('namespace', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull(),
    title: varchar('title', { length: 255 }),
    targetUrl: text('target_url').notNull(),
    createdBy: uuid('created_by')
      .references(() => users.id, { onDelete: 'set null' }),
    passwordHash: text('password_hash'),
    inCollection: boolean('in_collection').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    namespaceSlugUnique: unique('short_links_namespace_slug_key').on(
      table.namespace,
      table.slug
    ),
  })
)