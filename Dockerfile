# Dockerfile for Vibe Trading AI Agent
FROM node:18-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies for MCP servers
RUN pip3 install --no-cache-dir \
    google-generativeai \
    requests \
    python-dotenv

# Copy package.json first for better caching
COPY package.json /app/

# Install Node.js dependencies
RUN npm install --production

# Install global dependencies
RUN npm install -g @antv/mcp-server-chart @google/generative-ai-cli

# Copy application files
COPY . /app/

# Ensure .gemini directory exists and copy settings
RUN mkdir -p /app/.gemini
COPY .gemini/settings.json /app/.gemini/settings.json

# Create environment configuration
RUN echo "#!/bin/bash
echo '🔧 Configuring environment...'
echo 'Setting up API keys...'

# Set up environment variables
export GOOGLE_CLOUD_PROJECT=\${GOOGLE_CLOUD_PROJECT}
export GOOGLE_CLOUD_LOCATION=\${GOOGLE_CLOUD_LOCATION}
export NODE_ENV=\${NODE_ENV:-production}

# Update .gemini/settings.json with API keys if provided
if [ ! -z \"\${GEMINI_API_KEY}\" ]; then
  echo 'Configuring Gemini API key...'
  sed -i \"s/YourApiKey/\${GEMINI_API_KEY}/g\" /app/.gemini/settings.json
fi

if [ ! -z \"\${PLUSE_API_KEY}\" ]; then
  echo 'Configuring PlusE API key...'
  sed -i \"s/YourApiKey/\${PLUSE_API_KEY}/g\" /app/.gemini/settings.json
fi

echo '✅ Environment configured'
echo '🚀 Starting Vibe Trading AI Agent...'

# Start the Node.js server
exec node server.js
" > /app/start.sh

RUN chmod +x /app/start.sh

# Expose port
EXPOSE 8080

# Set environment variables
ENV PORT=8080
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Start the application
CMD ["/app/start.sh"]
