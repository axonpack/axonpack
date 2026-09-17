/** The three things every view here needs, so no view builds elements by hand. */

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  // `textContent` throughout: everything drawn came from a captured request, and a URL or a body
  // containing markup has to show as those characters.
  if (text !== undefined) node.textContent = text;
  return node;
}

export function add<T extends HTMLElement>(parent: HTMLElement, child: T): T {
  parent.appendChild(child);
  return child;
}

export function clear(node: HTMLElement): void {
  node.replaceChildren();
}
