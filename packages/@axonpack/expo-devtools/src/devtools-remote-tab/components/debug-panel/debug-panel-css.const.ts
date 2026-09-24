/** What the Debug panel needs on top of the Network panel's CSS, which it wraps itself in. */
export const DEBUG_PANEL_CSS = `
.axonpack-dbg-body { flex: 1; min-height: 0; overflow: auto; padding: 8px 12px 16px; }
.axonpack-dbg-label {
  margin: 10px 0 4px;
  color: var(--muted);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}
.axonpack-dbg-label:first-child { margin-top: 0; }
.axonpack-dbg-row { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; }
.axonpack-dbg-row .axonpack-net-type { margin: 0; }
.axonpack-dbg-row .axonpack-net-field { margin: 0; }
.axonpack-dbg-row .axonpack-net-field input { width: 64px; }
.axonpack-dbg-actions { display: flex; gap: 8px; margin-top: 12px; }
.axonpack-dbg-actions .axonpack-net-action { padding: 4px 14px; }
.axonpack-dbg-actions .axonpack-net-action[data-tone="error"] {
  border-color: var(--net-red);
  background: color-mix(in srgb, var(--net-red) 12%, transparent);
}
.axonpack-dbg-note { margin: 8px 0 0; color: var(--muted); font-size: 11px; line-height: 15px; }
`;
