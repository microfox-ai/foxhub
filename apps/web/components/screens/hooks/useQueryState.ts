import { useCallback, useEffect, useRef, useState } from "react";

// Similar API to useLocalState, but syncs with URL search query
// S: type of the state (should be serializable to string)
function useQueryState<S = string>(
  key: string,
  defaultValue: S | (() => S)
): [S, (value: S | ((prev: S) => S)) => void, () => void] {
  // Helper to get value from URL
  const getValueFromUrl = useCallback((): S => {
    if (typeof window === "undefined")
      return typeof defaultValue === "function"
        ? (defaultValue as any)()
        : defaultValue;
    const params = new URLSearchParams(window.location.search);
    const value = params.get(key);
    if (value === null) {
      return typeof defaultValue === "function"
        ? (defaultValue as any)()
        : defaultValue;
    }
    try {
      // Try to parse JSON, fallback to string
      return JSON.parse(value) as S;
    } catch {
      return value as unknown as S;
    }
  }, [key, defaultValue]);

  const [state, setState] = useState<S>(getValueFromUrl);
  const lastState = useRef(state);
  lastState.current = state;

  // Update state if URL changes (back/forward)
  useEffect(() => {
    const onPopState = () => {
      setState(getValueFromUrl());
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [getValueFromUrl]);

  // Set state and update URL (pushState for back-trackable)
  const setQueryState = useCallback(
    (newValue: S | ((prev: S) => S)) => {
      const valueToStore =
        typeof newValue === "function"
          ? (newValue as any)(lastState.current)
          : newValue;
      setState(valueToStore);
      if (typeof window === "undefined") return;
      const params = new URLSearchParams(window.location.search);
      // Store as JSON if not string
      const encoded =
        typeof valueToStore === "string"
          ? valueToStore
          : JSON.stringify(valueToStore);
      params.set(key, encoded);
      const newUrl = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
      window.history.pushState({}, "", newUrl);
    },
    [key]
  );

  // Reset: remove from URL and set to default
  const reset = useCallback(() => {
    setState(
      typeof defaultValue === "function"
        ? (defaultValue as any)()
        : defaultValue
    );
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    params.delete(key);
    const newUrl = `${window.location.pathname}${params.toString() ? "?" + params.toString() : ""}${window.location.hash}`;
    window.history.pushState({}, "", newUrl);
  }, [key, defaultValue]);

  return [state, setQueryState, reset];
}

export default useQueryState;
