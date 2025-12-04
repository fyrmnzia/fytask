import { useEffect } from "react";
import hotkeys from "hotkeys-js";

export function useHotkeys(key: string, callback: () => void, deps: any[] = []) {
  useEffect(() => {
    hotkeys(key, (event) => {
      event.preventDefault();
      callback();
    });

    return () => {
      hotkeys.unbind(key);
    };
  }, [key, ...deps]);
}
