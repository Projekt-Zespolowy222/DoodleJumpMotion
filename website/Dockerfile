FROM nginx:alpine

COPY . /usr/share/nginx/html

RUN mv /usr/share/nginx/html/config.js /usr/share/nginx/html/config.js.template

RUN echo 'envsubst < /usr/share/nginx/html/config.js.template > /usr/share/nginx/html/config.js' > /docker-entrypoint.d/00-subst-env.sh && \
    chmod +x /docker-entrypoint.d/00-subst-env.sh

COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80