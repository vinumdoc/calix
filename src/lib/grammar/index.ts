import { continuedIndent, foldInside, foldNodeProp, indentNodeProp } from '@codemirror/language';
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
			Body: foldInside
		})
	]
});

export { configuredParser as parser };
