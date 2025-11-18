# Step 1: Use Node.js as the base image
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm install --frozen-lockfile

# Copy the entire project
COPY . .

# Build the Next.js app
RUN npm run build

# Step 2: Use a lightweight Node.js image for running Next.js
FROM node:18-alpine

WORKDIR /app

# Copy built files from the builder stage
COPY --from=builder /app ./

# Expose Next.js port
EXPOSE 3000

# Start the Next.js server
CMD ["npm", "run", "start"]
