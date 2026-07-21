FROM node:20-alpine AS builder
WORKDIR /app

ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}
ARG VITE_RECAPTCHA_SITE_KEY
ENV VITE_RECAPTCHA_SITE_KEY=${VITE_RECAPTCHA_SITE_KEY}

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:stable-alpine
# SSL certificates are provided by the host (Let's Encrypt) and are mounted
# into the container at runtime under /etc/nginx/ssl. Do NOT generate
# self-signed certs at build time for production deployments.
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY nginx_main.conf /etc/nginx/nginx.conf
RUN mkdir -p /var/cache/nginx && chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx /run

# Run nginx as a non-root user when possible.
# The official nginx alpine image includes a dedicated nginx user.
USER nginx

EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
