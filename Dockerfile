# Use Node.js official image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install dependencies
RUN npm install
RUN cd backend && npm install

# Copy source code
COPY . .

# Build frontend
RUN npm run build

# Expose ports
EXPOSE 3000 4000

# Start script
CMD ["sh", "-c", "cd backend && npm start & npm run preview"]
