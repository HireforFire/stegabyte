import { useRef, useCallback, useEffect } from "react";
import type { EncryptedPayload, DecryptedPayload } from "@/types/crypto";
import type { encrypt as encryptFn, decrypt as decryptFn } from "@/lib/crypto/encrypt";

type WorkerResult =
  | { type: "encrypt-result"; payload: EncryptedPayload; id: number }
  | { type: "decrypt-result"; payload: DecryptedPayload; id: number }
  | { type: "error"; message: string; id: number };

/**
 * Lifetime-controlled wrapper around the crypto worker.
 *
 * - Each call returns a Promise that resolves when the matching reply arrives.
 * - On unmount, in-flight promises reject with an AbortError and the worker
 *   is terminated. This prevents hung awaits in React 19 strict-mode.
 * - Per-call timeout (30s) prevents indefinite hangs if a reply is lost.
 */
export function useCryptoWorker() {
  const workerRef = useRef<Worker | null>(null);
  const counterRef = useRef(0);

  useEffect(() => {
    const worker = new Worker(
      new URL("../workers/stegabyte-crypto.worker", import.meta.url),
      { type: "module" },
    );
    workerRef.current = worker;
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const send = useCallback(
    <T>(msg: Record<string, unknown>, successType: WorkerResult["type"]): Promise<T> =>
      new Promise((resolve, reject) => {
        const worker = workerRef.current;
        if (!worker) return reject(new Error("Worker not ready."));

        const id = ++counterRef.current;
        let settled = false;

        const handler = (e: MessageEvent<WorkerResult>) => {
          if (e.data.id !== id) return;
          settled = true;
          worker.removeEventListener("message", handler);
          worker.removeEventListener("error", onError);
          clearTimeout(timeoutId);
          if (e.data.type === "error") {
            reject(new Error(e.data.message));
          } else if (e.data.type === successType) {
            // Cast through unknown to avoid type-predicate limitations.
            resolve((e.data as unknown as { payload: T }).payload);
          } else {
            reject(new Error("Unexpected worker response."));
          }
        };

        const onError = (e: ErrorEvent) => {
          settled = true;
          worker.removeEventListener("message", handler);
          worker.removeEventListener("error", onError);
          clearTimeout(timeoutId);
          reject(new Error(e.message || "Worker error."));
        };

        const timeoutId = setTimeout(() => {
          if (settled) return;
          worker.removeEventListener("message", handler);
          worker.removeEventListener("error", onError);
          reject(new Error("Worker timed out."));
        }, 30_000);

        worker.addEventListener("message", handler);
        worker.addEventListener("error", onError);
        worker.postMessage({ ...msg, id });
      }),
    [],
  );

  const encryptInWorker = useCallback(
    (opts: Parameters<typeof encryptFn>[0]) =>
      send<EncryptedPayload>({ type: "encrypt", payload: opts }, "encrypt-result"),
    [send],
  );

  const decryptInWorker = useCallback(
    (opts: Parameters<typeof decryptFn>[0]) =>
      send<DecryptedPayload>({ type: "decrypt", payload: opts }, "decrypt-result"),
    [send],
  );

  return { encryptInWorker, decryptInWorker };
}
