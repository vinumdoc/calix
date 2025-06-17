FROM node:18-alpine AS development-build

# install pnpm
RUN npm install -g pnpm

WORKDIR /app

# copy package manifests & lockfile
COPY package.json pnpm-lock.yaml* ./

# install deps
RUN pnpm install --frozen-lockfile

# copy the rest of your source & build
COPY . .
RUN pnpm build

FROM node:18-alpine AS production-build

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

# placeholder: fetch vinumc binary from GitHub releases
# TODO: replace URL with actual release path & version
RUN apk add --no-cache curl \
 && curl -L \
      "https://github.com/vinumdoc/vinum/releases/download/vX.Y.Z/vinumc-linux-x64" \
      -o /usr/local/bin/vinumc \
 && chmod +x /usr/local/bin/vinumc

# expose production port
EXPOSE 3000

# start the Node server
CMD ["node", "build"]
