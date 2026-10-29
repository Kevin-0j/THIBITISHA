# Thibitisha USSD webhook. One container per customer instance (AT Marketplace).
FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY index.js ./
COPY src ./src
COPY db ./db

USER node
EXPOSE 3000
CMD ["node", "index.js"]
