import { useEffect } from 'react';

export default function useDialogFocus(ref) {
  useEffect(() => {
    const previous = document.activeElement;
    const node = ref.current;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    node.querySelector('[data-panel-close]')?.focus({ preventScroll: true });
    const trap = event => {
      if (event.key !== 'Tab') return;
      const items = [...node.querySelectorAll('button:not(:disabled), input, textarea, select, [tabindex="0"]')]
        .filter(item => item.getClientRects().length);
      if (!items.length) return;
      if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1).focus(); }
      else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0].focus(); }
    };
    node.addEventListener('keydown', trap);
    return () => {
      node.removeEventListener('keydown', trap);
      document.body.style.overflow = oldOverflow;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [ref]);
}

