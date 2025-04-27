/** @type {import('next').NextConfig} */
const nextConfig = {
    async rewrites() {
        return [
          {
            source: '/api/:path*',
            destination: 'http://localhost:8080/api/:path*', // 把请求代理到你的后端 Gin 服务
          },
        ];
      },
};

export default nextConfig;
