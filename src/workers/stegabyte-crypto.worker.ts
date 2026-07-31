/// <reference lib="webworker" />
import { encrypt as encryptFn, decrypt as decryptFn } from "@/lib/crypto/encrypt";
import type { EncryptedPayload, DecryptedPayload } from "@/types/crypto";

type WorkerRequest =
  | { type: "encrypt"; payload: Parameters<typeof encryptFn>[0]; id: number }
  | { type: "decrypt"; payload: Parameters<typeof decryptFn>[0]; id: number };

type WorkerResponse =
  | { type: "encrypt-result"; payload: EncryptedPayload; id: number }
  | { type: "decrypt-result"; payload: DecryptedPayload; id: number }
  | { type: "error"; message: string; id: number };

/**
 * Crypto web worker. Receives encrypt/decrypt requests from the main thread,
 * runs Web Crypto API operations off-thread, and posts results back.
 *
 * Errors are sanitized — the worker only returns a generic message string and
 * never forwards raw stack traces or library internals to the main thread.
 */
self.addEventListener("message", async (e: MessageEvent<WorkerRequest>) => {
  const { id } = e.data;
  try {
    if (e.data.type === "encrypt") {
      const result = await encryptFn(e.data.payload);
      const response: WorkerResponse = { type: "encrypt-result", payload: result, id };
      self.postMessage(response);
    } else if (e.data.type === "decrypt") {
      const result = await decryptFn(e.data.payload);
      const response: WorkerResponse = { type: "decrypt-result", payload: result, id };
      self.postMessage(response);
    } else {
      throw new Error("Unknown request type.");
    }
  } catch {
    const response: WorkerResponse = {
      type: "error",
      message: "Worker error.",
      id,
    };
    self.postMessage(response);
  }
});

export {};
