import { ExternalTokenizer } from '@lezer/lr';
import { Text, DeclMarker, GlobalDeclMarker, Identifier } from './vinum.grammar.terms';

const leftParen = 40,
	rightParen = 41,
	leftBracket = 91,
	rightBracket = 93,
	leftBrace = 123,
	hash = 35,
	dollar = 36,
	asterisk = 42,
	dot = 46,
	colon = 58,
	space = 32,
	tab = 9;

export const textTokenizer = new ExternalTokenizer((input, stack) => {
	if (input.next === space || input.next === tab) {
		while (input.next === space || input.next === tab) {
			input.advance();
		}
		return;
	}

	if (stack.canShift(GlobalDeclMarker) && input.next === colon && input.peek(1) === colon) {
		input.advance(2);
		input.acceptToken(GlobalDeclMarker);
		return;
	}

	if (stack.canShift(DeclMarker) && input.next === colon) {
		input.advance();
		input.acceptToken(DeclMarker);
		return;
	}

	if (!stack.canShift(Text)) return;
	if (stack.canShift(Identifier)) return;
	const start = input.pos;
	while (
		input.next !== -1 &&
		input.next !== leftParen &&
		input.next !== rightParen &&
		input.next !== leftBracket &&
		input.next !== rightBracket &&
		input.next !== dot &&
		(input.next !== leftBrace || input.peek(1) !== hash) &&
		(input.next !== dollar || input.peek(1) !== asterisk)
	) {
		input.advance();
	}
	if (input.pos === start) return;

	input.acceptToken(Text);
});
