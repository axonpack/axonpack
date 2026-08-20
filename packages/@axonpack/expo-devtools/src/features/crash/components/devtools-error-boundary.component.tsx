import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { TOUCH_TARGET } from '../../../core/constants/metrics.const';
import { makeThemedStyles } from '../../../core/utils/themed-styles.util';
import { captureCrash } from '../services/capture-crash.service';

export type DevtoolsErrorBoundaryProps = {
  children: ReactNode;
  /** Replaces the built-in screen. `reset` remounts the subtree that threw. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
};

type State = { error: Error | null };

/**
 * The only tier that can produce a **component stack**, which is usually the half of a React crash
 * worth reading — `ErrorUtils` sees the error, not the tree it came from. It also turns a render
 * error from a white screen into something with a Try again button, which is why it's worth mounting
 * even in a release build.
 */
export class DevtoolsErrorBoundary extends Component<DevtoolsErrorBoundaryProps, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    captureCrash(error, 'react-render', { componentStack: info.componentStack });
    this.props.onError?.(error, info);
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(error, this.reset);
    return <DefaultFallback error={error} onReset={this.reset} />;
  }
}

function DefaultFallback({ error, onReset }: { error: Error; onReset: () => void }) {
  const styles = useStyles();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.message} selectable>
        {error.message}
      </Text>
      <TouchableOpacity style={styles.button} onPress={onReset}>
        <Text style={styles.buttonLabel}>Try again</Text>
      </TouchableOpacity>
    </View>
  );
}

const useStyles = makeThemedStyles((COLORS) => ({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 24,
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  message: {
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    color: COLORS.textSecondary,
  },
  button: {
    minHeight: TOUCH_TARGET.min,
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: COLORS.accent,
  },
  buttonLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
}));
