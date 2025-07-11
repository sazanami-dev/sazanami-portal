
# さざなみポータル

SysHackで開発したものを継続開発で作成。<br>学校・組織向けの内部ポータルさシステムです。<br>メンバー管理、お知らせ配信機能を提供します。プロジェクト管理機能開発中。

## 使用技術

<p align="left">
  <!-- フロントエンド -->
  <img src="https://img.shields.io/badge/-React-61DAFB.svg?logo=react&style=for-the-badge&logoColor=white">
  <img src="https://img.shields.io/badge/-Next.js-000000.svg?logo=next.js&style=for-the-badge">
  <img src="https://img.shields.io/badge/-TypeScript-3178C6.svg?logo=typescript&style=for-the-badge&logoColor=white">
  <img src="https://img.shields.io/badge/-Tailwind%20CSS-06B6D4.svg?logo=tailwindcss&style=for-the-badge&logoColor=white">
  <img src="https://img.shields.io/badge/-Framer%20Motion-0055FF.svg?logo=framer&style=for-the-badge&logoColor=white">
  <!-- バックエンド -->
  <img src="https://img.shields.io/badge/-Node.js-339933.svg?logo=node.js&style=for-the-badge&logoColor=white">
  <img src="https://img.shields.io/badge/-PostgreSQL-4169E1.svg?logo=postgresql&style=for-the-badge&logoColor=white">
  <!-- 認証・その他 -->
  <img src="https://img.shields.io/badge/-NextAuth.js-000000.svg?logo=auth0&style=for-the-badge&logoColor=white">
  <img src="https://img.shields.io/badge/-Google%20OAuth-4285F4.svg?logo=google&style=for-the-badge&logoColor=white">
</p>

## 主な機能

### 認証システム
- **ドメイン制限**: 組織のGoogleアカウントのみでログイン可能

### メンバー管理
- **ユーザー登録**: 学籍番号、クラス情報などの登録
- **権限管理**: ロールベースのアクセス制御
- **メンバー一覧**: 権限に応じた情報の表示

### お知らせ機能
- **お知らせ投稿**: 運営・管理者による投稿
- **一覧表示**: お知らせの一覧表示

### プロジェクト管理(開発中)
- **プロジェクト作成**: 新規プロジェクトの作成
- **参加管理**: プロジェクトメンバーの管理

## 技術仕様詳細

### フロントエンド
- **TypeScript**
- **React**
- **Next.js**
- **Tailwind CSS**
- **HeroUI**
- **Framer Motion**

### バックエンド
- **Next.js API Routes**
- **NextAuth.js**
- **PostgreSQL**
- 
## 使用方法

### 初回ログイン
1. Googleアカウントでログイン
2. ユーザー情報を入力してサインアップ
3. 管理者による承認を得ることでメンバー権限が付与される

### 権限について
- **ゲスト**: ログイン後の初期状態、閲覧制限あり
- **メンバー**: 基本機能が利用可能
- **運営**: お知らせの投稿、メンバー権限の管理
- **管理者**: 全機能へのアクセス

## プロジェクト構造

```
src/
├── app/
│   ├── api/           # API Routes
│   ├── components/    # 共通コンポーネント
│   ├── announcement/  # お知らせページ
│   ├── member/        # メンバーページ
│   ├── project/       # プロジェクトページ
│   ├── signup/        # サインアップページ
│   └── top/           # トップページ
├── styles/            # スタイルファイル
├── utils/             # ユーティリティ
└── authOptions.ts     # 認証設定
```
