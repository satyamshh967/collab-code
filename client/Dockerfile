FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

# CRA inlines REACT_APP_* variables at build time, so they must be build args
ARG REACT_APP_SERVER_URL=http://localhost:3001
ARG REACT_APP_API_URL=http://localhost:3001/api
ENV REACT_APP_SERVER_URL=$REACT_APP_SERVER_URL \
    REACT_APP_API_URL=$REACT_APP_API_URL

COPY . .
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
