<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import {
		FieldGroup,
		Field,
		FieldLabel,
		FieldDescription,
		FieldError
	} from '$lib/components/ui/field/index.js';
	import { register } from '$lib/remotes/auth.remote';
	import { goto, invalidate } from '$app/navigation';
	import { sessionDependencyUrl } from '$lib';
	import { authClient } from '$lib/auth_client';
	import type { ComponentProps } from 'svelte';

	const id = $props.id();

	const { username, email, password, confirmPassword } = register.fields;

	async function enhancer({ submit }: { submit: () => Promise<void> }) {
		console.log(await submit());

		if (register.result?.token) {
			await invalidate(sessionDependencyUrl);
			await goto(resolve('/'));
		}
	}

	async function loginWithGoogle() {
		await authClient.signIn.social({
			provider: 'google'
		});
	}
</script>

<Card.Root class="mx-auto w-full max-w-sm">
	<Card.Header>
		<Card.Title>Create an account</Card.Title>
		<Card.Description>Enter your information below to create your account</Card.Description>
	</Card.Header>
	<Card.Content>
		<form {...register.enhance(enhancer)}>
			<FieldGroup>
				<Field>
					<FieldLabel for="username-{id}">Username</FieldLabel>
					<Input id="username-{id}" required {...username.as('text')} />
					{#each username.issues() as issue}
						<FieldError>{issue.message}</FieldError>
					{/each}
				</Field>
				<Field>
					<FieldLabel for="email-{id}">Email</FieldLabel>
					<Input id="email-{id}" placeholder="m@example.com" required {...email.as('email')} />
					<FieldDescription>
						We'll use this to contact you. We will not share your email with anyone else.
					</FieldDescription>
					{#each email.issues() as issue}
						<FieldError>{issue.message}</FieldError>
					{/each}
				</Field>
				<Field>
					<FieldLabel for="password-{id}">Password</FieldLabel>
					<Input id="password-{id}" required {...password.as('password')} />
					<FieldDescription>Must be at least 8 characters long.</FieldDescription>
					{#each password.issues() as issue}
						<FieldError>{issue.message}</FieldError>
					{/each}
				</Field>
				<Field>
					<FieldLabel for="confirm-password">Confirm Password</FieldLabel>
					<Input id="confirm-password" required {...confirmPassword.as('password')} />
					<FieldDescription>Please confirm your password.</FieldDescription>
					{#each confirmPassword.issues() as issue}
						<FieldError>{issue.message}</FieldError>
					{/each}
				</Field>
				<FieldGroup>
					<Field>
						<Button {...register.buttonProps.enhance(enhancer)}>Create Account</Button>
						<Button variant="outline" type="button" onclick={loginWithGoogle}>
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
								<path
									d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
									fill="currentColor"
								/>
							</svg>

							Sign up with Google
						</Button>
						<FieldDescription class="px-6 text-center">
							Already have an account? <a href="{base}/auth/login">Sign in</a>
						</FieldDescription>
					</Field>
				</FieldGroup>
			</FieldGroup>
		</form>
	</Card.Content>
</Card.Root>
