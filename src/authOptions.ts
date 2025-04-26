import { NextAuthOptions } from "next-auth";
import PostgresAdapter from "@auth/pg-adapter"
import { Pool } from "pg"
import GoogleProvider from "next-auth/providers/google";
import DiscordProvider from "next-auth/providers/discord";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  adapter: PostgresAdapter(new Pool({
    connectionString: process.env.DATABASE_URL,
  })),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const domain = user.email?.split("@")[1];
      return domain === process.env.AUTHORIZED_DOMAIN;
    },
  },
};
