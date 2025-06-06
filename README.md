# calix

Serves vinum for you to use and enjoy.

## Developing

This project uses [pnpm](https://pnpm.io/) as its package manager.

You need to set `VINUM_PATH` in the `.env` file to point to a vinum executable.

Once you've installed dependencies with `pnpm install`, start a development server:

```bash
pnpm run dev

# or start the server and open the app in a new browser tab
pnpm run dev --open
```

## Building

To create a production version of your app:

```bash
pnpm run build
```

You can preview the production build with `pnpm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
