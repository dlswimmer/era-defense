// Tiny DOM helpers.

type Attrs = Record<string, string | number | boolean | ((e: Event) => void)>;

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (typeof v === 'function') node.addEventListener(k.replace(/^on/, ''), v);
    else if (k === 'class') node.className = String(v);
    else if (k === 'html') node.innerHTML = String(v);
    else if (typeof v === 'boolean') {
      if (v) node.setAttribute(k, '');
    } else node.setAttribute(k, String(v));
  }
  node.append(...children);
  return node;
}

export const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;

/** Only touches the DOM when the value changes (safe to call every frame). */
export function setText(node: HTMLElement, s: string) {
  if (node.textContent !== s) node.textContent = s;
}

export function setDisabled(node: HTMLButtonElement, disabled: boolean) {
  if (node.disabled !== disabled) node.disabled = disabled;
}

export function showOverlay(...children: Node[]) {
  const overlay = $('overlay');
  overlay.replaceChildren(...children);
  overlay.hidden = false;
}

export function hideOverlay() {
  const overlay = $('overlay');
  overlay.hidden = true;
  overlay.replaceChildren();
}
