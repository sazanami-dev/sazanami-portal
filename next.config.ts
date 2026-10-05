import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Docker 向けに standalone 出力（.next/standalone に自己完結サーバーを生成）
  output: "standalone",
};

export default nextConfig;
