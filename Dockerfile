# Build stage
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build-only

# Production stage
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server.js .
COPY --from=build /app/dist ./dist
COPY src/data ./src/data

EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "server.js"]