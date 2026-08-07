# ---- Base Stage ----
# Sets up Node, pnpm, and copies package manifests.
FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils \
 && rm -rf /var/lib/apt/lists/*

FROM base AS development-build

# copy source
COPY . /app
WORKDIR /app

# install deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Build-time environment variables (for build process)
ARG DATABASE_URL="file:./local.db"
ARG NODE_ENV
ENV NODE_ENV=${NODE_ENV:-production}

ARG VINUMC_SOURCE=release
ARG VINUMC_VERSION=vinumc-v0.1.0-alpha
RUN if [ "$VINUMC_SOURCE" = "release" ]; then \
      apt-get update && apt-get install -y curl && \
      curl -L "https://github.com/vinumdoc/vinum/releases/download/${VINUMC_VERSION}/vinumc" \
        -o /usr/local/bin/vinumc && \
      chmod +x /usr/local/bin/vinumc; \
    fi


RUN pnpm build

FROM base AS production-build

# create app directory
WORKDIR /app

# install only production deps
COPY package.json pnpm-lock.yaml* .npmrc ./

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile

# copy built output from development-build
COPY --from=development-build /app/build ./build
# copy adapter entrypoint (SvelteKit adapter-node output)
COPY --from=development-build /app/package.json ./package.json
# copy drizzle migrations
COPY --from=development-build /app/drizzle ./drizzle

# Build-time environment variables (for build process)
ARG DATABASE_URL="file:./local.db"
ARG NODE_ENV
ENV NODE_ENV=${NODE_ENV:-production}

ARG VINUMC_VERSION=vinumc-v0.1.0-alpha
RUN apt-get update && apt-get install -y curl && \
    curl -L "https://github.com/vinumdoc/vinum/releases/download/${VINUMC_VERSION}/vinumc" \
      -o /usr/local/bin/vinumc && \
    chmod +x /usr/local/bin/vinumc

# expose production port
EXPOSE 3000

# start the Node server
CMD ["node", "build"]
