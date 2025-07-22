# calix

Serves vinum for you to use and enjoy.

## Prerequisites

- [pnpm](https://pnpm.io/)
- [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/)

## Environment

Duplicate `.env.example` and rename it to `.env` in the project root with the following variables:

### Configuration Options

The following environment variables are available:

- `VINUMC_SOURCE`: Set to `release` (default) to use pre-built binary from GitHub releases, or `local` to use a locally built binary
- `VINUMC_VERSION`: The version of vinumc to download (default: `vinumc-v0.1.0-alpha`)
- `VINUMC_PATH`: Path to your locally built vinumc binary (only needed when `VINUMC_SOURCE=local`)
- `DATABASE_URL`: PostgreSQL connection string
- `POSTGRES_USER`: PostgreSQL username
- `POSTGRES_PASSWORD`: PostgreSQL password

## Developing Locally

### 1. Install dependencies

```bash
pnpm install
```

### 2. Run the dev server

This will start Vite with HMR on port 5173, mounting your source and Vinum compiler into a container:

```bash
docker compose --profile dev up --build
```

Then open your browser to http://localhost:5173.

## Docker Workflows

There are two profiles in `docker-compose.yml`: **dev** and **prod**.

### Dev Profile

#### Using Release Binary (Default)

```bash
docker-compose --profile dev up --build
# or explicitly
docker-compose --profile dev-release up --build
```

#### Using Local Binary

```bash
docker-compose --profile dev-local up --build
```

- **app/app-release**: runs `pnpm dev --host 0.0.0.0` on port 5173 with release binary
- **app-local**: runs `pnpm dev --host 0.0.0.0` on port 5173 with local binary
- **db**: PostgreSQL on port 5432 (persistent data in `pgdata` volume)
- Source code is bind-mounted for live reload

### Prod Profile

```bash
docker-compose --profile prod up --build -d
```

- **db**: same Postgres service
- **app-prod**: runs the production SvelteKit build on port 3000
- `vinumc` is downloaded from its [Github releases page](https://github.com/vinumdoc/vinum/releases/) using the version specified in `VINUMC_VERSION`.

To tear down both workflows:

```bash
docker-compose down
```

## Vinumc Configuration

### Using Pre-built Releases (Default)

By default, the application uses pre-built vinumc binaries from GitHub releases:

```bash
# Use the default version (vinumc-v0.1.0-alpha)
VINUMC_SOURCE=release

# Or specify a different version
VINUMC_SOURCE=release
VINUMC_VERSION=vinumc-v0.1.0-alpha
```

### Using Local Build (Development Only)

If you want to use your locally built vinumc binary during development:

```bash
VINUMC_PATH=/path/to/your/vinumc
```

Then use the local profile:

```bash
docker-compose --profile dev-local up --build
```

The local binary will be mounted into the container during development.

**Note**: Production builds always use the release version for consistency and reliability.

### How Build Arguments Work

The Docker build process uses `ARG` variables that are passed from environment variables:

1. **Environment Variables** (in `.env` file) →
2. **Docker Compose** (`args:` section) →
3. **Dockerfile** (`ARG` declarations) →
4. **Build Process** (used in `RUN` commands)

For example:

```bash
# In .env file
VINUMC_VERSION=vinumc-v0.1.0-alpha

# In docker-compose.yml
args:
  VINUMC_VERSION: ${VINUMC_VERSION:-vinumc-v0.1.0-alpha}

# In Dockerfile
ARG VINUMC_VERSION=vinumc-v0.1.0-alpha
RUN curl -L "https://github.com/vinumdoc/vinum/releases/download/${VINUMC_VERSION}/vinumc"
```

## Building & Previewing

### Local build

```bash
pnpm run build
pnpm run preview  # Preview on http://localhost:4173 by default
```

### Docker build

The `app-prod` service is built using a multi-stage `Dockerfile`. It fetches dependencies, compiles your SvelteKit app, and downloads the Vinum compiler from GitHub releases. The version can be configured via the `VINUMC_VERSION` environment variable.
