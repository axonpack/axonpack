import type { ReduxAction } from '../stores/redux.store';

const PREVIEW_LENGTH = 120;

function json(value: unknown): string {
  try {
    return JSON.stringify(value) ?? '';
  } catch {
    return String(value);
  }
}

/**
 * Everything in the action but its type, on one line, or `null` when there is nothing else. Checked
 * on the JSON rather than the keys: a Redux Toolkit action creator called with no argument still
 * sets `payload: undefined`.
 */
export function formatActionPreview(action: ReduxAction): string | null {
  const { type: _type, ...rest } = action;
  const text = json(rest);
  if (text === '{}') return null;
  return text.length > PREVIEW_LENGTH ? `${text.slice(0, PREVIEW_LENGTH)}…` : text;
}

/** What a search runs over: the type and the rest of the action. */
export function actionSearchText(action: ReduxAction): string {
  return json(action);
}

export function formatClockTime(timestamp: number): string {
  return new Date(timestamp).toTimeString().slice(0, 8);
}

/**
 * Reads what was typed into the dispatch box. Returns the action, or an error to show under it.
 * Only a plain object with a string `type` is accepted, which is what a reducer expects.
 */
export function parseTypedAction(text: string): { action?: ReduxAction; error?: string } {
  const trimmed = text.trim();
  if (trimmed.length === 0) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { error: 'The action is not valid JSON.' };
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { error: 'The action must be a JSON object.' };
  }
  if (typeof (parsed as { type?: unknown }).type !== 'string') {
    return { error: 'The action needs a string "type".' };
  }
  return { action: parsed as ReduxAction };
}
