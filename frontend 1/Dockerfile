FROM node:20-alpine

WORKDIR /app

# Copy the package.json and lock files
COPY package*.json ./

# Install dependencies using npm
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose Vite's configured dev port
EXPOSE 8080

# Run the dev server
CMD ["npm", "run", "dev"]
