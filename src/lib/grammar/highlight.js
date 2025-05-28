import { styleTags, tags } from '@lezer/highlight';

export const highlighting = styleTags({
	Identifier: tags.tagName,
	String: tags.string,
	DryComment: tags.comment,
	'[ ]': tags.squareBracket,
	ChildrenShot: tags.keyword
});
