FROM node:18-alpine

# Install bash for scripts
RUN apk add --no-cache bash

WORKDIR /workspace

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Create directories for persistent storage
RUN mkdir -p /workspace/data /workspace/logs /workspace/scripts

# Make scripts executable
RUN chmod +x /workspace/scripts/*.sh || true

# Expose port
EXPOSE 3000

# Use startup script
CMD ["/workspace/scripts/startup.sh"]