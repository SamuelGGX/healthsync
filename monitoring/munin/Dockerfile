FROM debian:bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      munin \
      munin-node \
      nginx \
      libcgi-fast-perl \
      procps \
 && rm -rf /var/lib/apt/lists/* \
 && rm -f /etc/nginx/sites-enabled/default

COPY nginx-munin.conf /etc/nginx/sites-available/munin
RUN ln -s /etc/nginx/sites-available/munin /etc/nginx/sites-enabled/munin

COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 8080

CMD ["/start.sh"]
