FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:alpine

# Genera /etc/nginx/.htpasswd con admin:admin para proteger /munin/.
# Para cambiar credenciales: rebuild con --build-arg o entra al contenedor
# y corre: htpasswd -bc /etc/nginx/.htpasswd <usuario> <pass>
RUN apk add --no-cache apache2-utils \
 && htpasswd -bc /etc/nginx/.htpasswd admin admin

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
