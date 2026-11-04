import type { AgentActionOptions, AgentTopic } from '../constants/agent-topics.const';

/** What the CLI sends for `devtools <topic> <action> <args...> [options]`. */
export type AgentActionCall = {
  topic: string;
  action: string;
  args?: string[];
  options?: AgentActionOptions;
  /** Unique per command, so asking again for an action that waits finds that one call. */
  ref?: string;
};

export type ActionAnswer = string | { waitingFor: string; answer: Promise<string> };

/**
 * Checks a call against its topic's action and starts it. Never throws, and the promise never
 * rejects: a refused or failed action is one `error:` line, as a bad query is.
 */
export function runAction(topics: readonly AgentTopic[], call: AgentActionCall): ActionAnswer {
  try {
    const answer = start(topics, call);
    if (typeof answer === 'string') return answer;
    return { waitingFor: answer.waitingFor, answer: answer.answer.catch(errorLine) };
  } catch (error) {
    return errorLine(error);
  }
}

export function errorLine(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return `error: ${message.split('\n')[0]}`;
}

function start(topics: readonly AgentTopic[], call: AgentActionCall) {
  const topic = topics.find((each) => each.name === call?.topic || each.alias === call?.topic);
  if (!topic) {
    const names = topics.map((each) => each.name).join(', ');
    throw new Error(`unknown topic "${call?.topic}". Topics: ${names}`);
  }
  const actions = topic.actions ?? {};
  const names = Object.keys(actions);
  // Own keys only, so `toString` is not an action.
  const action = Object.prototype.hasOwnProperty.call(actions, call.action)
    ? actions[call.action]
    : undefined;
  if (!action) {
    throw new Error(
      names.length
        ? `${topic.name} has no action "${call.action}". Actions: ${names.join(', ')}`
        : `${topic.name} has no actions, only queries`
    );
  }
  if (topic.enabled?.() === false) {
    throw new Error(
      `${topic.name} is off: ${topic.off ?? 'the app turned it off in its devtools config'}`
    );
  }

  const usage = `usage: devtools ${topic.name} ${call.action} ${action.usage}`.trim();
  const args = call.args ?? [];
  const [min, max] = action.args;
  if (
    !Array.isArray(args) ||
    args.some((arg) => typeof arg !== 'string') ||
    args.length < min ||
    args.length > max
  ) {
    throw new Error(usage);
  }
  const options = call.options ?? {};
  for (const [key, value] of Object.entries(options)) {
    if (value === undefined) continue;
    const flag = key.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
    if (!action.options?.includes(key as keyof AgentActionOptions)) {
      throw new Error(`${topic.name} ${call.action} takes no --${flag}. ${usage}`);
    }
    // The relay passes on any JSON, so the shapes the CLI sends are checked here.
    const shaped =
      key === 'header'
        ? Array.isArray(value) && value.every((line) => typeof line === 'string')
        : key === 'yes' || key === 'all'
          ? value === true
          : typeof value === 'string';
    if (!shaped) throw new Error(`bad --${flag}. ${usage}`);
  }
  return action.run(args, options);
}
