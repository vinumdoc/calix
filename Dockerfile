FROM node:20-slim AS development-build

# install pnpm
RUN npm install -g pnpm

WORKDIR /app

# copy package manifests & lockfile
COPY package.json pnpm-lock.yaml* ./

# install deps
RUN pnpm install --frozen-lockfile

# copy the rest of source & build
COPY . .

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

FROM node:20-slim AS production-build

# create app directory
WORKDIR /app

# install only production deps
COPY package.json pnpm-lock.yaml* ./
RUN npm install -g pnpm \
 && pnpm install --prod --frozen-lockfile \
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
