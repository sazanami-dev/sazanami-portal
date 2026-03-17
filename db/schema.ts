// db/schema.ts
import {
    pgSchema,
    pgTable,
    pgEnum,
    uuid,
    text,
    varchar,
    integer,
    boolean,
    timestamp,
    jsonb,
  } from 'drizzle-orm/pg-core'
  
  // ==============================
  // auth schema 側（Supabase 管理）
  // ==============================
  
  const auth = pgSchema('auth')
  
  // Supabase の auth.users を Drizzle 上で型だけ定義
  export const authUsers = auth.table('users', {
    id: uuid('id').primaryKey(),            // Supabase auth.users.id
    email: text('email'),
    // 必要なら他のカラムも追加（型用なので最低限でOK）
  })
  
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
  
  export const users = pgTable('users', {
    // auth.users.id と 1:1 で対応する PK
    id: uuid('id')
      .primaryKey()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
  
    role: userRoleEnum('role').notNull().default('member'),
    email: text('email').notNull(),
  
    studentId: varchar('student_id', { length: 255 }), // 学籍番号
    className: varchar('class_name', { length: 255 }), // クラス（選択式を想定）
    attendanceNumber: integer('attendance_number'),    // 出席番号
  
    name: varchar('name', { length: 255 }).notNull(),
    nameKana: varchar('name_kana', { length: 255 }).notNull(),
  
    expectedGraduationYear: integer('expected_graduation_year'), // 例: 2026
  
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
  
  export const userIdentities = pgTable('user_identities', {
    id: uuid('id').primaryKey(),
  
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
  
    provider: identityProviderEnum('provider').notNull(),
  
    providerUserId: varchar('provider_user_id', { length: 255 }).notNull(),
    username: varchar('username', { length: 255 }).notNull(),
  
    isServerJoined: boolean('is_server_joined')
      .notNull()
      .default(false),
  
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  })
  
  // ==============================
  // user_profiles
  // ==============================
  
  export const userProfiles = pgTable('user_profiles', {
    // PK 兼 FK
    userId: uuid('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
  
    bio: text('bio'), // 自己紹介
    avatarUrl: varchar('avatar_url', { length: 1024 }),
  })
  
  // ==============================
  // terms
  // ==============================
  
  export const terms = pgTable('terms', {
    id: uuid('id').primaryKey(),
  
    content: text('content').notNull(), // Markdown
    version: integer('version').notNull(),
  
    updatedBy: uuid('updated_by')
      .notNull()
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
  
    // 操作者。ユーザー削除時に一緒に消したいなら cascade、履歴を残したいなら set null
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'set null' }),
  
    action: varchar('action', { length: 255 }).notNull(), // "CREATE", "UPDATE", "DELETE" など
    targetTable: varchar('target_table', { length: 255 }).notNull(),
    targetId: uuid('target_id'), // 対象レコードのID
  
    details: jsonb('details'), // 変更前後のデータなど
  
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  })