// db/schema.ts
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  varchar,
  integer,
  bigint,
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

// ==============================
// upload_templates
// ==============================
//
// ポータルからの Drive アップロード用テンプレート。
// segments はベースフォルダ直下からの順序付きパスセグメント列:
//   [{ type: 'static', value: '定例' },
//    { type: 'dynamic', token: 'month', format: 'YYYYMM', default: 'current' }]
// filename_format はファイル名規定（null = 元のファイル名のまま）。

export const uploadTemplates = pgTable('upload_templates', {
  id: uuid('id').primaryKey().defaultRandom(),

  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),

  baseFolderId: varchar('base_folder_id', { length: 255 }).notNull(),
  segments: jsonb('segments').notNull(),
  filenameFormat: text('filename_format'),

  isActive: boolean('is_active').notNull().default(true),
  // true の場合、manager 以上のみ閲覧・アップロード可能
  managerOnly: boolean('manager_only').notNull().default(false),

  createdBy: uuid('created_by').references(() => users.id, {
    onDelete: 'set null',
  }),

  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

// ==============================
// upload_logs
// ==============================
//
// アップロード履歴の収集・監査用。
// 本体はブラウザ→Google直送のため、セッション発行時に pending で記録し、
// 完了通知で completed / failed に確定する。

export const uploadLogs = pgTable('upload_logs', {
  id: uuid('id').primaryKey().defaultRandom(),

  templateId: uuid('template_id').references(() => uploadTemplates.id, {
    onDelete: 'set null',
  }),
  userId: uuid('user_id').references(() => users.id, {
    onDelete: 'set null',
  }),

  fileName: varchar('file_name', { length: 512 }).notNull(),
  originalName: varchar('original_name', { length: 512 }),

  driveFileId: varchar('drive_file_id', { length: 255 }),
  webViewLink: text('web_view_link'),

  folderId: varchar('folder_id', { length: 255 }),
  folderPath: text('folder_path'),

  mimeType: varchar('mime_type', { length: 255 }),
  sizeBytes: bigint('size_bytes', { mode: 'number' }),

  status: varchar('status', { length: 20 }).notNull().default('pending'),
  error: text('error'),

  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
})