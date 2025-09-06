# DEPRECATED: Docker configuration
# This Dockerfile is kept for reference but is not used in the current deployment
# The client requires non-Docker deployment. See DEPLOYMENT.md for current instructions.

FROM node:18-alpine AS build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend ./
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
