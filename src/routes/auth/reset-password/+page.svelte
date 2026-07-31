<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
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
	import { authClient } from '$lib/auth_client';
	import { goto } from '$app/navigation';

	let newPassword = $state('');
	let confirmPassword = $state('');
	let loading = $state(false);
	let errorMsg = $state('');

	const token = $derived(page.url.searchParams.get('token') || '');

	async function handleResetPassword(e: Event) {
		e.preventDefault();
		if (newPassword !== confirmPassword) {
			errorMsg = 'Passwords do not match.';
			return;
		}

		if (!token) {
			errorMsg = 'Invalid or missing reset token.';
			return;
		}

		loading = true;
		errorMsg = '';

		try {
			const res = await authClient.resetPassword({
				newPassword,
				token
			});
			if (res.error) {
				errorMsg = res.error.message || 'Failed to reset password.';
			} else {
				await goto(resolve('/auth/login'));
			}
		} catch (err) {
			errorMsg = (err as Error).message || 'An error occurred.';
		} finally {
			loading = false;
		}
	}
</script>

<div class="flex h-screen w-full items-center justify-center px-4">
	<Card.Root class="mx-auto w-full max-w-sm">
		<Card.Header>
			<Card.Title class="text-2xl">Set New Password</Card.Title>
			<Card.Description>Enter your new password below.</Card.Description>
		</Card.Header>
		<Card.Content>
			<form onsubmit={handleResetPassword}>
				<FieldGroup>
					<Field>
						<FieldLabel for="newPassword">New Password</FieldLabel>
						<Input id="newPassword" type="password" required bind:value={newPassword} />
					</Field>
					<Field>
						<FieldLabel for="confirmPassword">Confirm New Password</FieldLabel>
						<Input id="confirmPassword" type="password" required bind:value={confirmPassword} />
					</Field>
					{#if errorMsg}
						<FieldError>{errorMsg}</FieldError>
					{/if}
					<Field>
						<Button type="submit" class="w-full" disabled={loading}>
							{loading ? 'Resetting...' : 'Update Password'}
						</Button>
						<FieldDescription class="text-center">
							Back to <a href={resolve('/auth/login')} class="underline">Sign in</a>
						</FieldDescription>
					</Field>
				</FieldGroup>
			</form>
		</Card.Content>
	</Card.Root>
</div>
