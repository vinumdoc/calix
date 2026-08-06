import { continuedIndent, foldNodeProp, indentNodeProp } from '@codemirror/language';
import { parser } from './vinum.grammar';

//TODO: consertar indentação das brackets no final
const configuredParser = parser.configure({
	props: [
		indentNodeProp.add({
			'DryDefinition DryCall DryGlobalDefinition DryComment': continuedIndent({
				except: /^\s*\]$/
			}),
			GroupSweetCall: continuedIndent({
				except: /^\s*\)$/
			})
		}),
		foldNodeProp.add({
			DryDefinition(node) {
				const marker = node.getChild('DeclMarker');
				const close = node.getChild(']');
				if (!marker || !close) return null;

				return { from: marker.to, to: close.from };
			},
			DryGlobalDefinition(node) {
				const marker = node.getChild('GlobalDeclMarker');
				const close = node.getChild(']');
				if (!marker || !close) return null;

				return { from: marker.to, to: close.from };
			},
			DryCall(node) {
				const identifier = node.getChild('Identifier');
				const close = node.getChild(']');
				if (!identifier || !close) return null;

				return { from: identifier.to, to: close.from };
			},
			DryComment(node) {
				const commentTag = node.getChild('#');
				const close = node.getChild(']');
				if (!commentTag || !close) return null;

				return { from: commentTag.to, to: close.from };
			},
			GroupSweetCall(node) {
				const open = node.getChild('(');
				const close = node.getChild(').');
				if (!open || !close) return null;

				return { from: open.to, to: close.from };
			},
			String(node) {
				return { from: node.from + 2, to: node.to - 2 };
			}
		})
	]
});

export { configuredParser as parser };
