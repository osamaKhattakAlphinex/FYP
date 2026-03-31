/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        appDir: true,
    },
    images: {
        domains: ['localhost'],
    },
    env: {
        BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:5000',
        AI_SERVICE_URL: process.env.AI_SERVICE_URL || 'http://localhost:8000',
    },
}

module.exports = nextConfig