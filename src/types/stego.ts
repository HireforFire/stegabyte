/** Supported steganographic carrier formats. */
export type CarrierFormat = "png" | "bmp" | "wav" | "pdf" | "qr" | "zero-width-unicode";

/** Metadata describing an embedded payload to the carrier decoder. */
export interface StegoHeader {
  /** 4-byte magic number to identify the payload ("CRYX"). */
  magic: string;
  /** Version of the stego encoding format. */
  version: number;
  /** Byte-length of the ciphertext bundle. */
  payloadLength: number;
  /** Byte-length of the original plaintext. */
  originalLength: number;
}

/** Result returned from encode(). */
export interface EncodeResult {
  /** Data URL or byte array of the output image. */
  dataUrl: string;
  /** The total bytes that were usable for embedding. */
  capacityUsed: number;
  /** The total byte capacity of the image. */
  capacityTotal: number;
}

/** Result returned from decode(). */
export interface DecodeResult {
  /** The extracted ciphertext payload as hex string. */
  payload: string;
  /** Header metadata recovered during extraction. */
  header: StegoHeader;
}

/** Plugin interface for future format support. */
export interface StegoPlugin {
  readonly format: CarrierFormat;
  encode(carrier: ArrayBuffer, payload: ArrayBuffer): Promise<ArrayBuffer>;
  decode(carrier: ArrayBuffer): Promise<DecodeResult>;
}
