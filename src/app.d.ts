// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
			session?: import('better-auth').Session;
			user?: import('better-auth').User;
		}
	}
}

export {};
