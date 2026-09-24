import { getCompletions } from '../../../features/console/services/complete-expression.service';
import { runReplCommand } from '../../../features/console/services/run-repl-command.service';
import {
  consolePromptStore,
  useConsolePromptStore,
} from '../../../features/console/stores/console-prompt.store';
import { normalizeExpressionInput } from '../../../features/console/utils/normalize-expression.util';
import { SyncedInput } from '../network-panel/synced-input.component';

/**
 * The app's `>` prompt, on the same draft, so what is typed on one side is on the other.
 *
 * Enter arrives as a `keydown` whose `key` crosses; Shift does not, so this stays one line, as the
 * app's does. Every value set from outside the field remounts it, and `autoFocus` is what keeps the
 * caret in it: after a run, a suggestion, or a recalled command. A recall of the same text changes
 * nothing, so the focus request is the key as well.
 */
export function ConsolePrompt() {
  const draft = useConsolePromptStore((state) => state.draft);
  const focusRequest = useConsolePromptStore((state) => state.focusRequest);
  const completion = getCompletions(draft);
  const canRun = draft.trim().length > 0;

  function submit() {
    // The store, not the render's copy: a keystroke can land after this render went out.
    const source = consolePromptStore.getDraft();
    if (source.trim().length === 0) return;
    runReplCommand(source);
    consolePromptStore.setDraft('');
  }

  return (
    <div className="axonpack-con-prompt">
      {completion && (
        <div className="axonpack-con-suggestions">
          {completion.options.map((option) => (
            <button
              key={option}
              className="axonpack-net-type"
              onClick={() => consolePromptStore.recall(draft.slice(0, completion.start) + option)}>
              {option}
            </button>
          ))}
        </div>
      )}
      <div className="axonpack-con-prompt-row" data-con-icon="chevron-right">
        <span onKeyDown={(event: { key?: string }) => event.key === 'Enter' && submit()}>
          <SyncedInput
            key={focusRequest}
            value={draft}
            onChange={(text) => consolePromptStore.setDraft(normalizeExpressionInput(text))}
            label="Run an expression"
            placeholder="Run an expression"
            autoFocus
          />
        </span>
        {draft.length > 0 && (
          <button
            className="axonpack-net-button"
            data-icon="cross"
            title="Clear"
            onClick={() => consolePromptStore.setDraft('')}
          />
        )}
        <button
          className="axonpack-net-button"
          data-con-icon="play"
          aria-disabled={!canRun}
          title="Run"
          onClick={submit}
        />
      </div>
    </div>
  );
}
