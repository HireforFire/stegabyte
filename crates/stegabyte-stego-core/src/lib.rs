//! Stegabyte LSB core compiled to WebAssembly.
//!
//! All functions are pure: they operate on byte buffers passed in as
//! `&[u8]` slices. Outputs are returned as fresh `Vec<u8>` (pixel buffers)
//! or `Vec<u32>` (histogram) — `wasm-bindgen` marshals these as
//! `Uint8Array` / `Uint32Array` copies with zero per-call glue cost.
//!
//! This module intentionally contains ZERO filesystem, ZERO network, ZERO
//! randomness — it is a deterministic byte-transformation library. The
//! caller is responsible for any DOM/Canvas integration.

use wasm_bindgen::prelude::*;

const HEADER_BYTES: usize = 14;
const HEADER_VERSION: u16 = 1;
const MAGIC: &[u8; 4] = b"CRYX";
const LSB_CHANNELS_PER_PIXEL: usize = 3;
const LSB_BITS_PER_CHANNEL: u8 = 1;
const HISTOGRAM_BUCKETS: usize = 256;
const LOG2_BUCKETS: f64 = 8.0;
const EXPECTED_LSB_RATIO: f64 = 0.5;
const SUSPICION_GAIN: f64 = 3.0;

/// LSB capacity in bytes for an RGBA image of `width` × `height`.
/// Capacity = (width × height × 3 channels) / 8 bits per byte.
#[wasm_bindgen]
pub fn stegabyte_lsb_capacity(width: u32, height: u32) -> u32 {
    (width as u64 * height as u64 * LSB_CHANNELS_PER_PIXEL as u64 / 8) as u32
}

/// Header bytes length (constant for callers that want to slice off the header).
#[wasm_bindgen]
pub fn stegabyte_header_bytes() -> u32 {
    HEADER_BYTES as u32
}

/// Max allowed dimension per side (defence against OOM via huge dimensions).
#[wasm_bindgen]
pub fn stegabyte_max_dimension() -> u32 {
    16384
}

/// Encode a payload into the LSBs of `pixels` (RGBA, 4 bytes/pixel).
///
/// - `pixels`: input RGBA buffer.
/// - `payload`: plaintext-after-header bytes to embed.
/// - `width`, `height`: image dimensions (used for capacity calc).
/// - `original_length`: plaintext byte count, written to header bytes 10..13.
///
/// Returns a freshly allocated `Uint8Array` containing the modified pixel buffer.
///
/// Returns error if `pixels.len() != width * height * 4` or if the payload
/// doesn't fit in the image's LSB capacity.
#[wasm_bindgen]
pub fn stegabyte_encode(
    pixels: &[u8],
    payload: &[u8],
    width: u32,
    height: u32,
    original_length: u32,
) -> Result<Vec<u8>, JsValue> {
    let num_pixels = (width as usize).checked_mul(height as usize).ok_or_else(|| {
        js_err("width * height overflows usize")
    })?;
    let expected_pixels = num_pixels.checked_mul(4).ok_or_else(|| {
        js_err("pixel buffer length overflows usize")
    })?;
    if pixels.len() != expected_pixels {
        return Err(js_err(&format!(
            "pixel buffer length mismatch: expected {}, got {}",
            expected_pixels,
            pixels.len()
        )));
    }
    if width == 0 || height == 0 {
        return Err(js_err("width and height must be > 0"));
    }
    if width > 16384 || height > 16384 {
        return Err(js_err("width or height exceeds MAX_DIMENSION (16384)"));
    }

    let capacity = num_pixels * LSB_CHANNELS_PER_PIXEL / 8;
    let total_payload = HEADER_BYTES
        .checked_add(payload.len())
        .ok_or_else(|| js_err("payload + header overflows usize"))?;
    if total_payload > capacity {
        return Err(js_err(&format!(
            "Payload too large: {} bytes needed, {} available",
            total_payload, capacity
        )));
    }

    // Allocate output pixel buffer and seed it with the input pixels.
    let mut out = vec![0u8; pixels.len()];
    out.copy_from_slice(pixels);

    // Write the 14-byte header into a scratch buffer.
    let mut header = [0u8; HEADER_BYTES];
    header[0..4].copy_from_slice(MAGIC);
    header[4..6].copy_from_slice(&HEADER_VERSION.to_le_bytes());
    header[6..10].copy_from_slice(&(payload.len() as u32).to_le_bytes());
    header[10..14].copy_from_slice(&original_length.to_le_bytes());

    let total_bytes = HEADER_BYTES + payload.len();
    let total_bits = total_bytes * 8;

    let mut bit_idx: usize = 0;
    'outer: for p in 0..num_pixels {
        let offset = p * 4;
        for ch in 0..LSB_CHANNELS_PER_PIXEL {
            if bit_idx >= total_bits {
                break 'outer;
            }
            let byte_idx = bit_idx >> 3;
            let bit_in_byte = bit_idx & 7;
            let byte = if byte_idx < HEADER_BYTES {
                header[byte_idx]
            } else {
                payload[byte_idx - HEADER_BYTES]
            };
            let bit = (byte >> bit_in_byte) & LSB_BITS_PER_CHANNEL;
            let channel_offset = offset + ch;
            out[channel_offset] = (out[channel_offset] & 0xFE) | bit;
            bit_idx += 1;
        }
    }

    Ok(out)
}

/// Decode an LSB payload out of `pixels`. Returns a `Uint8Array` containing
/// `[HEADER_BYTES | payload...]`. Use `stegabyte_header_bytes()` to slice
/// off the prefix.
///
/// Returns error if `pixels.len() != width * height * 4`, if the image is too
/// small to contain a header, or if the magic bytes don't match.
#[wasm_bindgen]
pub fn stegabyte_decode(
    pixels: &[u8],
    width: u32,
    height: u32,
) -> Result<Vec<u8>, JsValue> {
    let num_pixels = (width as usize).checked_mul(height as usize).ok_or_else(|| {
        js_err("width * height overflows usize")
    })?;
    let expected_pixels = num_pixels.checked_mul(4).ok_or_else(|| {
        js_err("pixel buffer length overflows usize")
    })?;
    if pixels.len() != expected_pixels {
        return Err(js_err(&format!(
            "pixel buffer length mismatch: expected {}, got {}",
            expected_pixels,
            pixels.len()
        )));
    }
    if width == 0 || height == 0 {
        return Err(js_err("width and height must be > 0"));
    }
    if width > 16384 || height > 16384 {
        return Err(js_err("width or height exceeds MAX_DIMENSION (16384)"));
    }

    let total_bits = num_pixels * LSB_CHANNELS_PER_PIXEL;
    if total_bits < HEADER_BYTES * 8 {
        return Err(js_err("Image too small to contain a payload."));
    }

    // First decode the 14-byte header.
    let mut header = [0u8; HEADER_BYTES];
    for i in 0..HEADER_BYTES {
        let mut b: u8 = 0;
        let base = i * 8;
        for bi in 0..8 {
            let bit_idx = base + bi;
            let p = bit_idx / LSB_CHANNELS_PER_PIXEL;
            let ch = bit_idx % LSB_CHANNELS_PER_PIXEL;
            let lsb = pixels[p * 4 + ch] & 1;
            b |= lsb << bi;
        }
        header[i] = b;
    }

    if &header[0..4] != MAGIC {
        return Err(js_err("No Stegabyte payload (magic bytes missing)."));
    }

    let payload_len =
        u32::from_le_bytes([header[6], header[7], header[8], header[9]]) as usize;
    let max_payload = (total_bits / 8).saturating_sub(HEADER_BYTES);
    if payload_len > max_payload {
        return Err(js_err("Declared payload length exceeds image capacity."));
    }

    // Decode payload.
    let mut payload = vec![0u8; payload_len];
    let total_payload_bytes = HEADER_BYTES + payload_len;
    let total_payload_bits = total_payload_bytes * 8;
    let mut bit_idx: usize = HEADER_BYTES * 8;
    for i in 0..payload_len {
        let mut b: u8 = 0;
        let base = bit_idx;
        for bi in 0..8 {
            let idx = base + bi;
            let p = idx / LSB_CHANNELS_PER_PIXEL;
            let ch = idx % LSB_CHANNELS_PER_PIXEL;
            let lsb = pixels[p * 4 + ch] & 1;
            b |= lsb << bi;
        }
        payload[i] = b;
        bit_idx += 8;
        if bit_idx > total_payload_bits {
            return Err(js_err("Payload overrun while decoding."));
        }
    }

    // Combine header + payload into one buffer.
    let mut out = Vec::with_capacity(total_payload_bytes);
    out.extend_from_slice(&header);
    out.extend_from_slice(&payload);

    Ok(out)
}

/// Normalized Shannon entropy over R,G,B channels (0..1).
/// Skips alpha.
#[wasm_bindgen]
pub fn stegabyte_entropy(pixels: &[u8]) -> f64 {
    if pixels.is_empty() || pixels.len() % 4 != 0 {
        return 0.0;
    }
    let mut buckets = [0u64; HISTOGRAM_BUCKETS];
    let mut count: u64 = 0;
    let mut chunks = pixels.chunks_exact(4);
    for chunk in &mut chunks {
        for ch in 0..LSB_CHANNELS_PER_PIXEL {
            buckets[chunk[ch] as usize] += 1;
            count += 1;
        }
    }
    if count == 0 {
        return 0.0;
    }
    let mut entropy = 0.0_f64;
    for &b in buckets.iter() {
        if b > 0 {
            let p = b as f64 / count as f64;
            entropy -= p * p.log2();
        }
    }
    entropy / LOG2_BUCKETS
}

/// LSB suspicion metric: how far the R,G/B LSB ratio deviates from 50/50.
/// Returns 0..1 — higher means more anomalous.
#[wasm_bindgen]
pub fn stegabyte_lsb_suspicion(pixels: &[u8]) -> f64 {
    if pixels.is_empty() || pixels.len() % 4 != 0 {
        return 0.0;
    }
    let mut lsb_ones: u64 = 0;
    let mut checked: u64 = 0;
    let mut chunks = pixels.chunks_exact(4);
    for chunk in &mut chunks {
        for ch in 0..LSB_CHANNELS_PER_PIXEL {
            lsb_ones += (chunk[ch] & LSB_BITS_PER_CHANNEL) as u64;
            checked += 1;
        }
    }
    if checked == 0 {
        return 0.0;
    }
    let ratio = lsb_ones as f64 / checked as f64;
    let deviation = (ratio - EXPECTED_LSB_RATIO).abs();
    (deviation * SUSPICION_GAIN).min(1.0)
}

/// Returns a 256-bin histogram of R,G,B channel byte values (alpha skipped).
#[wasm_bindgen]
pub fn stegabyte_histogram(pixels: &[u8]) -> Vec<u32> {
    let mut buckets = vec![0u32; HISTOGRAM_BUCKETS];
    if pixels.is_empty() || pixels.len() % 4 != 0 {
        return buckets;
    }
    let mut chunks = pixels.chunks_exact(4);
    for chunk in &mut chunks {
        for ch in 0..LSB_CHANNELS_PER_PIXEL {
            buckets[chunk[ch] as usize] += 1;
        }
    }
    buckets
}

#[wasm_bindgen(start)]
pub fn _start() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

fn js_err(msg: &str) -> JsValue {
    JsValue::from_str(msg)
}
