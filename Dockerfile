# ---- Base Stage ----
# Sets up Node, pnpm, and copies package manifests.
FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable


FROM base AS development-build

# copy source
COPY . /app
WORKDIR /app

# install deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Build-time environment variables (for build process)
ARG DATABASE_URL="file:./local.db"
ARG NODE_ENV="production"

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

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile \
 && pnpm store prune

# copy built output from development-build
COPY --from=development-build /app/build ./build
# copy adapter entrypoint (SvelteKit adapter-node output)
COPY --from=development-build /app/package.json ./package.json

# Build-time environment variables (for build process)
ARG DATABASE_URL="file:./local.db"
ARG NODE_ENV="production"

ARG VINUMC_VERSION=vinumc-v0.1.0-alpha
RUN apt-get update && apt-get install -y curl && \
    curl -L "https://github.com/vinumdoc/vinum/releases/download/${VINUMC_VERSION}/vinumc" \
      -o /usr/local/bin/vinumc && \
    chmod +x /usr/local/bin/vinumc

# expose production port
EXPOSE 3000

# start the Node server
CMD ["node", "build"]
