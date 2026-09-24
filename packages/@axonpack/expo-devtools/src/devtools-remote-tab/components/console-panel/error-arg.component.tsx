import { useState } from 'react';

/**
 * An error: the message, and an arrow that opens the stack. When the error caused a crash, the
 * message opens that crash's report instead, as in the app, because the report is the stack and
 * more. The arrow still only opens the stack.
 */
export function ErrorArg({
  text,
  stack,
  onOpenReport,
}: {
  text: string;
  stack?: string;
  onOpenReport?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const toggle = () => setExpanded((open) => !open);

  if (!stack) {
    return onOpenReport ? (
      <button className="axonpack-con-error axonpack-con-report" onClick={onOpenReport}>
        {text}
      </button>
    ) : (
      <span className="axonpack-con-error">{text}</span>
    );
  }

  return (
    <div>
      <div className="axonpack-con-error">
        <button
          className="axonpack-con-disclosure"
          data-con-icon="triangle-down"
          aria-expanded={expanded}
          aria-label={expanded ? 'Hide stack' : 'Show stack'}
          onClick={toggle}
        />
        <span
          className={onOpenReport ? 'axonpack-con-text axonpack-con-report' : 'axonpack-con-text'}
          title={onOpenReport ? 'Open the crash report' : undefined}
          onClick={onOpenReport ?? toggle}>
          {text}
        </span>
      </div>
      {expanded && <div className="axonpack-con-stack">{stack}</div>}
    </div>
  );
}
