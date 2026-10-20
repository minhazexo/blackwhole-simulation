import { useState, useEffect } from "react";

export function useWebGPUSupport() {
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (typeof navigator === "undefined") {
      setIsSupported(false);
      return;
    }

    if (!navigator.gpu) {
      setIsSupported(false);
      setError("WebGPU is not supported by your browser.");
      return;
    }

    navigator.gpu
      .requestAdapter()
      .then((adapter) => {
        if (cancelled) return;
        if (adapter) {
          setIsSupported(true);
        } else {
          setIsSupported(false);
          setError("No WebGPU adapter found.");
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setIsSupported(false);
        setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { isSupported, error };
}
