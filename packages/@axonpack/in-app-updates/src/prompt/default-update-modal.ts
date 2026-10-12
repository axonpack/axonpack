import { createElement as h, useState } from "react";

import { reactNative } from "../runtime";
import { ALERT_ICON, UPDATE_ICON } from "./icons";
import type {
  UpdateModalLabels,
  UpdateModalProps,
  UpdateModalTheme,
} from "./types";

export const LIGHT_THEME: UpdateModalTheme = {
  mode: "auto",
  backdrop: "rgba(15, 23, 42, 0.55)",
  card: "#ffffff",
  surface: "#f4f6fa",
  border: "#e4e8f0",
  title: "#0f172a",
  text: "#334155",
  muted: "#64748b",
  primary: "#2563eb",
  primaryText: "#ffffff",
  primarySoft: "#e6eeff",
  danger: "#dc2626",
  dangerSoft: "#fdeaea",
  radius: 20,
  maxWidth: 340,
  fonts: {},
};

export const DARK_THEME: UpdateModalTheme = {
  ...LIGHT_THEME,
  backdrop: "rgba(0, 0, 0, 0.7)",
  card: "#1c2130",
  surface: "#262c3d",
  border: "#323a4f",
  title: "#f8fafc",
  text: "#cbd5e1",
  muted: "#94a3b8",
  primary: "#5b8def",
  primarySoft: "#243558",
  danger: "#f87171",
  dangerSoft: "#4a2326",
};

export const DEFAULT_LABELS: UpdateModalLabels = {
  title: "Update available",
  forcedTitle: "Update required",
  // Empty on purpose: the title and the version row already say it. Set a label to add a line.
  message: () => "",
  forcedMessage: (minimum) =>
    `This version is no longer supported${minimum ? `. Update to ${minimum} or newer` : ""}.`,
  installed: "Installed",
  latest: "Latest",
  releaseNotes: "What's new",
  update: "Update",
  later: "Later",
  skip: "Skip this version",
};

// react-native's own types are not a dependency of this package, so its components are loosely typed here.
type Rn = Record<string, any>;

/** Merges a partial theme over the light or dark base. Exported so a custom modal can reuse it. */
export const resolveTheme = (
  partial: Partial<UpdateModalTheme> | undefined,
  systemScheme: string | null | undefined,
): UpdateModalTheme => {
  const mode = partial?.mode ?? "auto";
  const dark = mode === "dark" || (mode === "auto" && systemScheme === "dark");
  const base = dark ? DARK_THEME : LIGHT_THEME;
  return { ...base, ...partial, fonts: { ...base.fonts, ...partial?.fonts } };
};

export const DefaultUpdateModal = (props: UpdateModalProps) => {
  const [notesOpen, setNotesOpen] = useState(false);
  const rn = reactNative() as Rn | undefined;
  if (!rn) return null;
  const {
    Modal,
    View,
    Text,
    Pressable,
    ScrollView,
    Platform,
    ActivityIndicator,
    Image,
  } = rn;
  const theme = resolveTheme(props.theme, rn.useColorScheme?.());
  const labels = { ...DEFAULT_LABELS, ...props.labels };
  const { radius, fonts } = theme;
  const message = props.isForced
    ? labels.forcedMessage(props.minimumVersion)
    : labels.message(props.latestVersion, props.currentVersion);
  const accent = props.isForced ? theme.danger : theme.primary;
  const accentSoft = props.isForced ? theme.dangerSoft : theme.primarySoft;

  // A custom font family replaces the weight, since most families ship one file per weight.
  const font = (weight: "regular" | "medium" | "bold", size: number) => {
    const family = fonts[weight];
    return {
      fontSize: size,
      ...(family
        ? { fontFamily: family }
        : {
            fontWeight:
              weight === "bold" ? "700" : weight === "medium" ? "600" : "400",
          }),
    };
  };

  const shadow =
    Platform?.OS === "ios"
      ? {
          shadowColor: "#000",
          shadowOpacity: 0.18,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 8 },
        }
      : { elevation: 8 };

  const versionBox = (label: string, value: string, highlight: boolean) =>
    h(
      View,
      { key: label, style: { flex: 1, alignItems: "center" } },
      h(
        Text,
        {
          style: { ...font("medium", 12), color: theme.muted, marginBottom: 2 },
        },
        label,
      ),
      h(
        Text,
        {
          style: {
            ...font("bold", 17),
            color: highlight ? accent : theme.title,
          },
        },
        value,
      ),
    );

  const action = (label: string, color: string, onPress: () => void) =>
    h(
      Pressable,
      {
        key: label,
        onPress,
        disabled: props.isUpdating,
        accessibilityRole: "button",
        style: ({ pressed }: { pressed: boolean }) => ({
          flex: 1,
          minHeight: 44,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: radius / 2,
          opacity: pressed ? 0.55 : 1,
        }),
      },
      h(Text, { style: { ...font("medium", 15), color } }, label),
    );

  return h(
    Modal,
    {
      visible: props.visible,
      transparent: true,
      animationType: "fade",
      statusBarTranslucent: true,
      // Android back button: closes a soft prompt, does nothing on a forced one.
      onRequestClose: props.isForced ? () => {} : props.onDismiss,
    },
    h(
      View,
      {
        style: {
          flex: 1,
          backgroundColor: theme.backdrop,
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
        },
      },
      h(
        View,
        {
          accessibilityViewIsModal: true,
          style: {
            width: "100%",
            maxWidth: theme.maxWidth,
            backgroundColor: theme.card,
            borderRadius: radius,
            padding: 24,
            ...shadow,
          },
        },
        h(
          View,
          {
            style: {
              alignSelf: "center",
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: accentSoft,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            },
          },
          props.icon ??
            h(Image, {
              source: { uri: props.isForced ? ALERT_ICON : UPDATE_ICON },
              accessible: false,
              style: { width: 28, height: 28, tintColor: accent },
            }),
        ),
        h(
          Text,
          {
            accessibilityRole: "header",
            style: {
              ...font("bold", 22),
              color: theme.title,
              textAlign: "center",
            },
          },
          props.isForced ? labels.forcedTitle : labels.title,
        ),
        message
          ? h(
              Text,
              {
                style: {
                  ...font("regular", 15),
                  lineHeight: 22,
                  color: theme.text,
                  textAlign: "center",
                  marginTop: 8,
                },
              },
              message,
            )
          : null,
        h(
          View,
          {
            style: {
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: theme.surface,
              borderRadius: radius / 1.5,
              paddingVertical: 12,
              marginTop: 20,
            },
          },
          versionBox(labels.installed, props.currentVersion, false),
          h(
            Text,
            { style: { ...font("medium", 18), color: theme.muted } },
            "→",
          ),
          versionBox(labels.latest, props.latestVersion, true),
        ),
        props.releaseNotes
          ? h(
              View,
              { style: { marginTop: 14 } },
              h(
                Pressable,
                {
                  onPress: () => setNotesOpen((open) => !open),
                  accessibilityRole: "button",
                  accessibilityState: { expanded: notesOpen },
                  style: ({ pressed }: { pressed: boolean }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    minHeight: 44,
                    opacity: pressed ? 0.6 : 1,
                  }),
                },
                h(
                  Text,
                  {
                    style: {
                      ...font("medium", 15),
                      color: theme.primary,
                      textDecorationLine: "underline",
                    },
                  },
                  labels.releaseNotes,
                ),
                h(
                  Text,
                  {
                    style: {
                      ...font("bold", 22),
                      color: theme.primary,
                      transform: [{ rotate: notesOpen ? "90deg" : "0deg" }],
                    },
                  },
                  "›",
                ),
              ),
              notesOpen
                ? h(
                    View,
                    {
                      style: {
                        borderWidth: 1,
                        borderColor: theme.border,
                        borderRadius: radius / 1.5,
                        maxHeight: 150,
                        marginTop: 4,
                      },
                    },
                    h(
                      ScrollView,
                      {
                        nestedScrollEnabled: true,
                        contentContainerStyle: { padding: 12 },
                      },
                      h(
                        Text,
                        {
                          style: {
                            ...font("regular", 14),
                            lineHeight: 20,
                            color: theme.text,
                          },
                        },
                        props.releaseNotes,
                      ),
                    ),
                  )
                : null,
            )
          : null,
        h(
          Pressable,
          {
            onPress: props.onUpdate,
            disabled: props.isUpdating,
            accessibilityRole: "button",
            accessibilityState: { busy: props.isUpdating },
            style: ({ pressed }: { pressed: boolean }) => ({
              minHeight: 52,
              borderRadius: radius / 1.7,
              backgroundColor: accent,
              alignItems: "center",
              justifyContent: "center",
              marginTop: 22,
              opacity: pressed ? 0.85 : 1,
            }),
          },
          props.isUpdating
            ? h(ActivityIndicator, { color: theme.primaryText })
            : h(
                Text,
                { style: { ...font("bold", 16), color: theme.primaryText } },
                labels.update,
              ),
        ),
        props.isForced
          ? null
          : h(
              View,
              { style: { flexDirection: "row", marginTop: 8 } },
              action(labels.later, theme.primary, props.onDismiss),
              props.canSkip
                ? action(labels.skip, theme.muted, props.onSkip)
                : null,
            ),
      ),
    ),
  );
};
