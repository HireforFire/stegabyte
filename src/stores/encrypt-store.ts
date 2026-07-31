import { create } from "zustand";

export type EncryptStatus = "idle" | "encrypting" | "embedding" | "done" | "error";

export interface EncryptState {
  /** Raw image file selected for stego embedding. */
  imageFile: File | null;
  /** The message text the user wants to hide. */
  message: string;
  /** Password for AES-256-GCM encryption. */
  password: string;
  /** Result data URL of the stego image. */
  resultDataUrl: string | null;
  /** Current workflow status. */
  status: EncryptStatus;
  /** Error message, if any. */
  error: string | null;
  /** Progress fraction 0..1. */
  progress: number;
  /** Debug: estimated capacity in bytes. */
  capacityUsed: number;
  /** Debug: total capacity in bytes. */
  capacityTotal: number;

  setImageFile: (file: File | null) => void;
  setMessage: (msg: string) => void;
  setPassword: (pw: string) => void;
  setStatus: (status: EncryptStatus) => void;
  setError: (error: string | null) => void;
  setProgress: (progress: number) => void;
  setResult: (dataUrl: string, capacityUsed: number, capacityTotal: number) => void;
  reset: () => void;
}

const initial = {
  imageFile: null,
  message: "",
  password: "",
  resultDataUrl: null,
  status: "idle" as EncryptStatus,
  error: null,
  progress: 0,
  capacityUsed: 0,
  capacityTotal: 0,
};

export const useEncryptStore = create<EncryptState>((set) => ({
  ...initial,

  setImageFile: (imageFile) => set({ imageFile, status: "idle", error: null }),
  setMessage: (message) => set({ message }),
  setPassword: (password) => set({ password }),
  setStatus: (status) => set({ status }),
  setError: (error) => set({ error, status: error ? "error" : "idle" }),
  setProgress: (progress) => set({ progress }),
  setResult: (resultDataUrl, capacityUsed, capacityTotal) =>
    set({ resultDataUrl, capacityUsed, capacityTotal, status: "done" }),
  reset: () => set({ ...initial }),
}));
