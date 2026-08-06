import { EventEmitter } from 'expo';

type ConsolePromptEvents = {
  change: () => void;
};

let draft = '';
// Bumped rather than set to a boolean, so recalling the same text twice still asks for focus.
let focusRequest = 0;
const emitter = new EventEmitter<ConsolePromptEvents>();

/**
 * The prompt's text lives here rather than in `ConsolePrompt`'s own state so a log row can push into
 * it without a callback threaded down through the memoized list — and so typing re-renders only the
 * prompt, not the `FlatList` above it.
 */
export const consolePromptStore = {
  getDraft(): string {
    return draft;
  },
  getFocusRequest(): number {
    return focusRequest;
  },
  subscribe(listener: () => void) {
    const subscription = emitter.addListener('change', listener);
    return () => subscription.remove();
  },
  setDraft(next: string) {
    draft = next;
    emitter.emit('change');
  },
  /** Loads a previous command back into the prompt and asks it to take focus for editing. */
  recall(source: string) {
    draft = source;
    focusRequest += 1;
    emitter.emit('change');
  },
};
