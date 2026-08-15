import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';

// High-contrast SQL palette inspired by pgAdmin's token categories and the
// familiar Dark+ family used by mainstream code editors.
const sqlHighlightStyle = HighlightStyle.define([
  { tag: [tags.keyword, tags.controlKeyword, tags.definitionKeyword, tags.moduleKeyword, tags.operatorKeyword], color: '#79b8ff', fontWeight: '700' },
  { tag: [tags.typeName, tags.className], color: '#4ec9b0' },
  { tag: [tags.string, tags.character, tags.attributeValue], color: '#e6a57e' },
  { tag: [tags.number, tags.integer, tags.float], color: '#d7d98c', fontWeight: '600' },
  { tag: [tags.bool, tags.null, tags.atom], color: '#c792ea', fontWeight: '600' },
  { tag: [tags.comment, tags.lineComment, tags.blockComment], color: '#78a66a', fontStyle: 'italic' },
  { tag: tags.function(tags.variableName), color: '#dcdcaa' },
  { tag: [tags.variableName, tags.propertyName, tags.name], color: '#e8e3d5' },
  { tag: [tags.operator, tags.compareOperator, tags.logicOperator, tags.arithmeticOperator], color: '#d4d4d4' },
  { tag: [tags.punctuation, tags.separator, tags.bracket], color: '#b8b2a3' },
  { tag: tags.invalid, color: '#f48771', textDecoration: 'underline wavy' },
]);

export const sqlEditorTheme = EditorView.theme({
  '&': { color: '#e8e3d5', backgroundColor: '#242a22' },
  '.cm-content': { caretColor: '#fff2ae' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: '#fff2ae' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': { backgroundColor: '#4f6047' },
  '.cm-activeLine': { backgroundColor: 'rgba(113, 128, 93, .13)' },
  '.cm-gutters': { backgroundColor: '#1d231d', color: '#687064', border: 'none' },
  '.cm-activeLineGutter': { backgroundColor: 'rgba(113, 128, 93, .13)', color: '#c8c3b5' },
  '.cm-matchingBracket': { backgroundColor: '#495542', outline: '1px solid #8b9a7b' },
}, { dark: true });

export const sqlSyntaxHighlighting = syntaxHighlighting(sqlHighlightStyle);
