# Stage 1: Build the Vue app
FROM node:22-alpine AS builder

WORKDIR /build

# Copy the content modules (needed at build time by Vite plugin)
COPY Tier-1-Foundations/ ./Tier-1-Foundations/
COPY Tier-2-Intermediate/ ./Tier-2-Intermediate/
COPY Tier-3-Advanced/ ./Tier-3-Advanced/
COPY Tier-4-Master/ ./Tier-4-Master/

# Copy app package files and install dependencies
COPY app/package.json app/package-lock.json ./app/
WORKDIR /build/app
RUN npm ci

# Copy the rest of the app source
COPY app/ ./

# Build the production bundle
RUN npm run build


# Stage 2: Serve with Nginx
FROM nginx:1.27-alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
COPY --from=builder /build/app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 6969

CMD ["nginx", "-g", "daemon off;"]
