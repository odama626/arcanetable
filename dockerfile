FROM caddy:latest 
COPY ./Caddyfile /etc/caddy/Caddyfile
COPY ./dist /dist