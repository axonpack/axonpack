import { EventEmitter } from 'expo';

type ConsolePromptEvents = {
  change: () => void;
};

let draft = '';

let focusRequest = 0;
const emitter = new EventEmitter<ConsolePromptEvents>();

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
  recall(source: string) {
    draft = source;
    focusRequest += 1;
    emitter.emit('change');
  },
};
