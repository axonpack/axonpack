import { useEffect } from 'react';
import type { MenuItem } from '@axonpack/react-pretty-print';

export type MenuState = { items: MenuItem[]; x: number; y: number };

/**
 * The web half of what the package deliberately doesn't ship: a fixed-position popover with a
 * click-away backdrop. The native example renders the same items through an RN `Modal` instead.
 */
export function ContextMenu({ menu, onClose }: { menu: MenuState | null; onClose: () => void }) {
  useEffect(() => {
    if (!menu) return;
    const close = () => onClose();
    window.addEventListener('click', close);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('resize', close);
    };
  }, [menu, onClose]);

  if (!menu) return null;

  return (
    <div
      style={{
        position: 'fixed',
        // Clamped so a right-click near the bottom-right edge doesn't open off-screen.
        left: Math.min(menu.x, window.innerWidth - 230 - 8),
        top: Math.min(menu.y, window.innerHeight - menu.items.length * 34 - 16),
        width: 230,
        padding: '4px 0',
        background: '#1c2128',
        border: '1px solid #30363d',
        borderRadius: 8,
        boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
      }}>
      {menu.items.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={() => {
            item.onSelect();
            onClose();
          }}
          style={{
            display: 'block',
            width: '100%',
            padding: '8px 14px',
            border: 'none',
            background: 'none',
            color: '#e6edf3',
            font: 'inherit',
            fontSize: 13,
            textAlign: 'left',
            cursor: 'pointer',
          }}>
          {item.label}
        </button>
      ))}
    </div>
  );
}
