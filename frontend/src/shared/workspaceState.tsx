import { createContext, useCallback, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';

type Values = Record<string, unknown>;
type Store = { values: Values; update: (key: string, action: SetStateAction<unknown>, initial: unknown) => void };
const Context = createContext<Store | null>(null);

/** Mémoire du poste de travail, détruite à la déconnexion/changement d'utilisateur.
 * Aucun dossier, jeton ou PDF n'est écrit dans localStorage/sessionStorage. */
export function WorkspaceStateProvider({ children }: { children: ReactNode }) {
  const [values, setValues] = useState<Values>({});
  const update = useCallback((key: string, action: SetStateAction<unknown>, initial: unknown) => {
    setValues(previous => ({ ...previous, [key]: typeof action === 'function'
      ? (action as (value: unknown) => unknown)(previous[key] ?? initial) : action }));
  }, []);
  return <Context.Provider value={{ values, update }}>{children}</Context.Provider>;
}
export function useWorkspaceState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const store = useContext(Context);
  if (!store) throw new Error('Une session de travail est requise.');
  const setValue = useCallback<Dispatch<SetStateAction<T>>>(action => store.update(key, action as SetStateAction<unknown>, initial), [store.update, key]);
  return [(store.values[key] ?? initial) as T, setValue];
}
export const locationValue = (key: string) => new URLSearchParams(window.location.hash.split('?')[1]).get(key) ?? '';
export function rememberLocation(key: string, value: string) {
  const [route, query] = window.location.hash.split('?');
  const parameters = new URLSearchParams(query);
  if (value) parameters.set(key, value); else parameters.delete(key);
  const suffix = parameters.toString();
  window.history.replaceState(window.history.state, '', `${route}${suffix ? `?${suffix}` : ''}`);
}
export const searchText = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr');
