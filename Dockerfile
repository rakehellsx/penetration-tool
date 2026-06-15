FROM node:22-bookworm AS app

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl bash tar xz-utils git \
  && rm -rf /var/lib/apt/lists/*

ENV GO_VERSION=1.23.4
RUN curl -fsSL "https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz" -o /tmp/go.tgz \
  && rm -rf /usr/local/go \
  && tar -C /usr/local -xzf /tmp/go.tgz \
  && rm /tmp/go.tgz

ENV PATH="/usr/local/go/bin:/root/.opencode/bin:${PATH}"
RUN curl -fsSL https://opencode.ai/install | bash

COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

ENV NODE_ENV=production
ENV PORT=3000
ENV OPENCODE_PORT=4096
ENV OPENCODE_API_URL=http://127.0.0.1:4096
ENV GO_PATH=/usr/local/go/bin/go

EXPOSE 3000
VOLUME ["/app/generated", "/app/logs"]

CMD ["bash", "scripts/production-start.sh"]
