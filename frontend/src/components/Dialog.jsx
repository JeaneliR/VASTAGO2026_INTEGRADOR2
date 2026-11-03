import React, { useEffect, useId, useRef } from "react";

export default function Dialog({ titulo, onClose, busy = false, children, wide = false }) {
  const ref = useRef(null), id = useId();
  useEffect(() => {
    const previous = document.activeElement;
    const focusable = () => [...ref.current.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href]')];
    focusable()[0]?.focus();
    function key(e) {
      if (e.key === "Escape" && !busy) onClose();
      if (e.key === "Tab") {
        const items = focusable(), first = items[0], last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    }
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("keydown", key); previous?.focus(); };
  }, [busy, onClose]);
  return <div className="modal-bg" onMouseDown={e => { if (!busy && e.target === e.currentTarget) onClose(); }}>
    <div ref={ref} className={"modal" + (wide ? " wide" : "")} role="dialog" aria-modal="true" aria-labelledby={id}>
      <h3 id={id}>{titulo}</h3>{children}
    </div>
  </div>;
}
