# Use Node 18 Alpine as the base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files first (better build caching)
COPY package*.json ./

# Install all dependencies (including nodemon)
RUN npm ci

# Copy all source files
COPY . .

# Create a non-root user for security
RUN addgroup -S appgroup && \
    adduser -S appuser -G appgroup && \
    chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose your application port
EXPOSE 8000

# Set environment to production
ENV NODE_ENV=production

# Start the app using the start script from package.json (nodemon app.js)
CMD ["npm", "start"]
