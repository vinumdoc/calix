<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { FieldGroup, Field, FieldLabel, FieldDescription, FieldError } from '$lib/components/ui/field/index.js';
	import { authClient } from '$lib/auth_client';

	let { data } = $props();

	let name = $state(data.user?.name || '');
	let image = $state(data.user?.image || '');
	let updateMessage = $state('');
	let updateError = $state('');
	let updating = $state(false);

	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let passMessage = $state('');
	let passError = $state('');
	let passUpdating = $state(false);

	async function handleUpdateProfile(e: Event) {
		e.preventDefault();
		updating = true;
		updateMessage = '';
		updateError = '';

		try {
			const res = await authClient.updateUser({
				name,
				image
			});

			if (res.error) {
				updateError = res.error.message || 'Failed to update profile';
			} else {
				updateMessage = 'Profile updated successfully!';
			}
		} catch (err: any) {
			updateError = err.message || 'An error occurred';
		} finally {
			updating = false;
		}
	}

	async function handleChangePassword(e: Event) {
		e.preventDefault();
		if (newPassword !== confirmPassword) {
			passError = 'New passwords do not match.';
			return;
		}

		passUpdating = true;
		passMessage = '';
		passError = '';

		try {
			const res = await authClient.changePassword({
				currentPassword,
				newPassword,
				revokeOtherSessions: true
			});

			if (res.error) {
				passError = res.error.message || 'Failed to change password';
			} else {
				passMessage = 'Password updated successfully!';
				currentPassword = '';
				newPassword = '';
				confirmPassword = '';
			}
		} catch (err: any) {
			passError = err.message || 'An error occurred';
		} finally {
			passUpdating = false;
		}
	}
</script>

<div class="container mx-auto max-w-4xl px-4 py-8 space-y-8">
	<div>
		<h1 class="text-3xl font-bold tracking-tight">Account Settings</h1>
		<p class="text-muted-foreground">Manage your profile details and security preferences.</p>
	</div>

	<!-- Profile Information Card -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Profile Information</Card.Title>
			<Card.Description>Update your display name and avatar image URL.</Card.Description>
		</Card.Header>
		<Card.Content>
			<form onsubmit={handleUpdateProfile}>
				<FieldGroup class="space-y-4">
					<Field>
						<FieldLabel for="email">Email</FieldLabel>
						<Input id="email" type="email" value={data.user?.email || ''} disabled class="bg-muted" />
						<FieldDescription>Email address associated with your account.</FieldDescription>
					</Field>
					<Field>
						<FieldLabel for="name">Display Name</FieldLabel>
						<Input id="name" type="text" bind:value={name} required />
					</Field>
					<Field>
						<FieldLabel for="image">Avatar Image URL</FieldLabel>
						<Input id="image" type="url" placeholder="https://example.com/avatar.png" bind:value={image} />
					</Field>
					{#if updateError}
						<FieldError>{updateError}</FieldError>
					{/if}
					{#if updateMessage}
						<p class="text-sm text-green-600 dark:text-green-400 font-medium">{updateMessage}</p>
					{/if}
					<Field>
						<Button type="submit" disabled={updating}>
							{updating ? 'Saving...' : 'Save Profile'}
						</Button>
					</Field>
				</FieldGroup>
			</form>
		</Card.Content>
	</Card.Root>

	<!-- Security / Change Password Card -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Change Password</Card.Title>
			<Card.Description>Update your password to keep your account secure.</Card.Description>
		</Card.Header>
		<Card.Content>
			<form onsubmit={handleChangePassword}>
				<FieldGroup class="space-y-4">
					<Field>
						<FieldLabel for="currentPassword">Current Password</FieldLabel>
						<Input id="currentPassword" type="password" required bind:value={currentPassword} />
					</Field>
					<Field>
						<FieldLabel for="newPassword">New Password</FieldLabel>
						<Input id="newPassword" type="password" required bind:value={newPassword} />
					</Field>
					<Field>
						<FieldLabel for="confirmPassword">Confirm New Password</FieldLabel>
						<Input id="confirmPassword" type="password" required bind:value={confirmPassword} />
					</Field>
					{#if passError}
						<FieldError>{passError}</FieldError>
					{/if}
					{#if passMessage}
						<p class="text-sm text-green-600 dark:text-green-400 font-medium">{passMessage}</p>
					{/if}
					<Field>
						<Button type="submit" disabled={passUpdating}>
							{passUpdating ? 'Updating...' : 'Change Password'}
						</Button>
					</Field>
				</FieldGroup>
			</form>
		</Card.Content>
	</Card.Root>
</div>
