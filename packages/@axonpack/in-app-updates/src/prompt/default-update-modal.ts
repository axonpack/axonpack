import { createElement as h } from "react";

import { reactNative } from "../runtime";
import type {
  UpdateModalLabels,
  UpdateModalProps,
  UpdateModalTheme,
} from "./types";

export const DEFAULT_THEME: UpdateModalTheme = {
  backdrop: "rgba(0,0,0,0.5)",
  card: "#ffffff",
  title: "#111111",
  text: "#444444",
  primary: "#2563eb",
  primaryText: "#ffffff",
  secondaryText: "#2563eb",
};

export const DEFAULT_LABELS: UpdateModalLabels = {
  title: "Update available",
  forcedTitle: "Update required",
  message: (latest, current) =>
    `Version ${latest} is out. You have ${current}.`,
  forcedMessage: (minimum) =>
    `This version is no longer supported${minimum ? `. Update to ${minimum} or newer` : ""}.`,
  releaseNotes: "What's new",
  update: "Update",
  later: "Later",
  skip: "Skip this version",
};

// react-native's own types are not a dependency of this package, so its components are loosely typed here.
type Rn = Record<string, any>;

export const DefaultUpdateModal = (props: UpdateModalProps) => {
  const rn = reactNative() as Rn | undefined;
  if (!rn) return null;
  const { Modal, View, Text, Pressable, ScrollView } = rn;
  const theme = { ...DEFAULT_THEME, ...props.theme };
  const labels = { ...DEFAULT_LABELS, ...props.labels };

  const button = (label: string, onPress: () => void, primary: boolean) =>
    h(
      Pressable,
      {
        key: label,
        onPress,
        accessibilityRole: "button",
        style: {
          paddingVertical: 12,
          borderRadius: 10,
          alignItems: "center",
          marginTop: 8,
          backgroundColor: primary ? theme.primary : "transparent",
        },
      },
      h(
        Text,
        {
          style: {
            fontSize: 16,
            fontWeight: "600",
            color: primary ? theme.primaryText : theme.secondaryText,
          },
        },
        label,
      ),
    );

  return h(
    Modal,
    {
      visible: props.visible,
      transparent: true,
      animationType: "fade",
      // Android back button: closes a soft prompt, does nothing on a forced one.
      onRequestClose: props.isForced ? () => {} : props.onLater,
    },
    h(
      View,
      {
        style: {
          flex: 1,
          backgroundColor: theme.backdrop,
          justifyContent: "center",
          padding: 24,
        },
      },
      h(
        View,
        {
          style: { backgroundColor: theme.card, borderRadius: 16, padding: 20 },
        },
        h(
          Text,
          {
            style: { fontSize: 20, fontWeight: "700", color: theme.title },
            accessibilityRole: "header",
          },
          props.isForced ? labels.forcedTitle : labels.title,
        ),
        h(
          Text,
          { style: { marginTop: 8, fontSize: 15, color: theme.text } },
          props.isForced
            ? labels.forcedMessage(props.minimumVersion)
            : labels.message(props.latestVersion, props.currentVersion),
        ),
        props.releaseNotes
          ? h(
              View,
              { style: { marginTop: 12 } },
              h(
                Text,
                { style: { fontWeight: "600", color: theme.title } },
                labels.releaseNotes,
              ),
              h(
                ScrollView,
                { style: { maxHeight: 160, marginTop: 4 } },
                h(Text, { style: { color: theme.text } }, props.releaseNotes),
              ),
            )
          : null,
        button(labels.update, props.onUpdate, true),
        props.isForced ? null : button(labels.later, props.onLater, false),
        props.isForced || props.onSkip === noop
          ? null
          : button(labels.skip, props.onSkip, false),
      ),
    ),
  );
};

/** Passed as onSkip when the skip button is hidden. */
export const noop = () => {};
