import { useSyncExternalStore } from "react";

/**
 * "Olho" dos valores: esconde (desfoca) os números marcados com `data-money`.
 * Fica salvo neste navegador e vale para todas as telas.
 */
const KEY = "noma:hide-values";
const CLASS = "noma-hide-values";
const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

let hidden: boolean | null = null;

function current(): boolean {
  if (hidden === null) {
    hidden = read();
    document.documentElement.classList.toggle(CLASS, hidden);
  }
  return hidden;
}

export function setValuesHidden(next: boolean) {
  hidden = next;
  document.documentElement.classList.toggle(CLASS, next);
  try {
    localStorage.setItem(KEY, next ? "1" : "0");
  } catch {
    // Sem armazenamento local: vale só até recarregar.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useValuesHidden(): [boolean, (next: boolean) => void] {
  const value = useSyncExternalStore(subscribe, current, () => false);
  return [value, setValuesHidden];
}
