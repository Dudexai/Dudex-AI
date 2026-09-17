FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application
COPY . .

# Expose Vite port
EXPOSE 8080

# Start Vite and make it accessible externally
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "8080"]
