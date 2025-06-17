# calix

Serves vinum for you to use and enjoy.

## Prerequisites

- [pnpm](https://pnpm.io/)
- [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/)

## Environment

Duplicate `.env.example` and rename it to `.env` in the project root with the following variables:

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

```bash
docker-compose --profile dev up --build
```

- **app**: runs `pnpm dev --host 0.0.0.0` on port 5173
- **db**: PostgreSQL on port 5432 (persistent data in `pgdata` volume)
- Source code is bind-mounted for live reload, and `vinumc` is mounted from `VINUM_PATH`.

### Prod Profile

```bash
docker-compose --profile prod up --build -d
```

- **db**: same Postgres service
- **app-prod**: runs the production SvelteKit build on port 3000
- `vinumc` is downloaded from its [Github releases page](https://github.com/vinumdoc/vinum/releases/). _(Coming soon)_

To tear down both workflows:

```bash
docker-compose down
```

## Building & Previewing

### Local build

```bash
pnpm run build
pnpm run preview  # Preview on http://localhost:4173 by default
```

### Docker build

The `app-prod` service is built using a multi-stage `Dockerfile`. It fetches dependencies, compiles your SvelteKit app, and (placeholder) downloads the Vinum compiler from a GitHub release. Replace the URL with your actual release path.
