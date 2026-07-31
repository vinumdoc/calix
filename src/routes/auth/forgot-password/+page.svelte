<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { FieldGroup, Field, FieldLabel, FieldDescription, FieldError } from '$lib/components/ui/field/index.js';
	import { requestPasswordReset } from '$lib/remotes/auth.remote';

	let email = $state('');
	let loading = $state(false);
	let message = $state('');
	let errorMsg = $state('');

	async function handleForgotPassword(e: Event) {
		e.preventDefault();
		loading = true;
		message = '';
		errorMsg = '';

		try {
			const res = await requestPasswordReset(email);
			if (!res.success) {
				errorMsg = res.error || 'Failed to send reset link.';
			} else {
				message = 'Password reset instructions have been sent to your email.';
			}
		} catch (err: any) {
			errorMsg = err.message || 'An error occurred.';
		} finally {
			loading = false;
		}
	}
</script>

<div class="flex h-screen w-full items-center justify-center px-4">
	<Card.Root class="mx-auto w-full max-w-sm">
		<Card.Header>
			<Card.Title class="text-2xl">Reset Password</Card.Title>
			<Card.Description>Enter your email to receive a password reset link.</Card.Description>
		</Card.Header>
		<Card.Content>
			<form onsubmit={handleForgotPassword}>
				<FieldGroup>
					<Field>
						<FieldLabel for="email">Email</FieldLabel>
						<Input id="email" type="email" placeholder="m@example.com" required bind:value={email} />
					</Field>
					{#if errorMsg}
						<FieldError>{errorMsg}</FieldError>
					{/if}
					{#if message}
						<p class="text-sm text-green-600 dark:text-green-400 font-medium">{message}</p>
					{/if}
					<Field>
						<Button type="submit" class="w-full" disabled={loading}>
							{loading ? 'Sending...' : 'Send Reset Link'}
						</Button>
						<FieldDescription class="text-center">
							Remembered your password? <a href={resolve('/auth/login')} class="underline">Back to sign in</a>
						</FieldDescription>
					</Field>
				</FieldGroup>
			</form>
		</Card.Content>
	</Card.Root>
</div>
