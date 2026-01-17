FROM node:22-bookworm-slim AS ui-builder

#ARG BASE_PATH=/pdp10/console/
WORKDIR /build/web

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm ci || npm install

# Copy UI source
COPY . ./

# Build UI - pass ARG as env var to vite
RUN BASE_PATH=${BASE_PATH} npm run build

# Stage 3: Serve with nginx
FROM nginx:1.29.4-alpine-slim

# Copy built files
COPY --from=ui-builder /build/web/dist/ /usr/share/nginx/html/

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
