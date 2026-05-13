FROM node:20-bookworm-slim

ENV NODE_ENV=production

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .
RUN mkdir -p /app/data /app/uploads/logos /app/uploads/chat

EXPOSE 3000

CMD ["npm", "start"]
