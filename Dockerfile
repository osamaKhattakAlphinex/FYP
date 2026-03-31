# Use official Node.js LTS (Long Term Support) image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy backend package files
COPY backend/package.json backend/package-lock.json ./

# Install dependencies
# Use --omit=dev to install only production dependencies
RUN npm ci --omit=dev

# Copy backend application source code
COPY backend/ ./

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose the port your app runs on
EXPOSE 5000

# Set environment to production
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:5000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["npm", "start"]
