# Use official Node image
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package files first (for caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Install Playwright dependencies (browser binaries)
RUN npx playwright install --with-deps chromium

# Copy the rest of the app
COPY . .

# Expose port (same as your code)
EXPOSE 3000

# Start the server
CMD ["npm", "start"]
