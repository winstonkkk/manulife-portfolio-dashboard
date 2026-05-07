# Use official Node 20 image as base
FROM node:20-alpine

# Set working directory inside the container
WORKDIR /app

# Copy dependency list first (leverages Docker layer caching)
COPY package.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the backend code
COPY . .

# Expose the port Express listens on
EXPOSE 5000

# Start the server
CMD ["node", "server.js"]