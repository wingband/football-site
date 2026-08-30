import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "media.api-sports.io",
        pathname: "/**",
      },
    ],
    // Vercel Hobby 플랜의 이미지 최적화는 월 1,000장 한도가 있어서, 이미 그 한도를
    // 넘긴 뒤로는 새로운 선수/팀 사진마다 최적화가 실패하고(402) 대체 텍스트로만
    // 나오고 있었다. media.api-sports.io 이미지는 API 쪽에서 이미 적당한 크기로
    // 제공되므로, Vercel의 최적화 파이프라인을 그냥 건너뛰고 원본을 그대로 서빙한다.
    unoptimized: true,
  },
};

export default nextConfig;
