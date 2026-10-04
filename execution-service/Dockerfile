FROM node:18-alpine

# Install Docker CLI to interact with host Docker daemon if needed
RUN apk add --no-cache docker-cli

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3002

CMD ["node", "src/index.js"]
