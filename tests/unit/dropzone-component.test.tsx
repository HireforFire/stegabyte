// @vitest-environment jsdom

/**
 * React Testing Library tests for the DropZone component.
 *
 * v1.0 had no component-level tests for DropZone; only the pure
 * `readPngHeader` sniffer was exercised (under `@vitest-environment node`).
 * The DropZone component itself — keyboard nav, file validation flow,
 * error states, "Pick another" CTA, and the multi-file path — had no
 * coverage. This file closes that gap.
 *
 * Strategy:
 * - jsdom doesn't ship a real `<input type="file">` change event that
 *   we can drive, so we use `fireEvent.change` with a synthetic
 *   `FileList` constructed via `DataTransfer`.
 * - We mock `isNativePngPickerSupported` so the test doesn't depend on
 *   the host browser's File System Access API support.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DropZone } from "@/components/ui/dropzone";

// Mock the picker module so tests don't depend on the host browser.
vi.mock("@/lib/files/picker", async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importOriginal<typeof import("@/lib/files/picker")>();
  return {
    ...actual,
    isNativePngPickerSupported: () => false,
    tryNativePngPicker: vi.fn(),
  };
});

/** Build a minimal 26-byte synthetic PNG header (8-byte magic + 18-byte IHDR start). */
function makePngBytes(): Uint8Array {
  const bytes = new Uint8Array(26);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  return bytes;
}

function makeJpegBytes(): Uint8Array {
  const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
  return bytes;
}

function fileFromBytes(bytes: Uint8Array, name: string, type: string): File {
  return new File([bytes], name, { type });
}

function dataTransfer(files: File[]): DataTransfer {
  // jsdom's `DataTransfer` constructor isn't always available; build a minimal
  // mock that fires a usable `files` array on the input's change event.
  return {
    files,
    items: [],
    types: ["Files"],
    dropEffect: "none",
    effectAllowed: "none",
    clearData: () => undefined,
    getData: () => "",
    setData: () => undefined,
    setDragImage: () => undefined,
  } as unknown as DataTransfer;
}

/**
 * Fire a `change` event on an `<input type="file">` with the given files.
 * React's synthetic event system needs the native `files` property to be
 * defined as a `FileList`; we patch it via `Object.defineProperty` so the
 * synthetic onChange handler runs.
 */
function changeInputFiles(input: HTMLInputElement, files: File[]): void {
  Object.defineProperty(input, "files", {
    configurable: true,
    value: files,
  });
  fireEvent.change(input);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DropZone", () => {
  it("renders the default hint and is keyboard-activatable", () => {
    render(<DropZone onFile={() => undefined} />);
    const surface = screen.getByRole("button", { name: /drag and drop/i });
    expect(surface).toBeInTheDocument();
    expect(surface).toHaveAttribute("tabIndex", "0");
  });

  it("calls onFile when a valid PNG is selected via the hidden input", async () => {
    const onFile = vi.fn();
    render(<DropZone onFile={onFile} />);
    const png = fileFromBytes(makePngBytes(), "test.png", "image/png");
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    // jsdom's File constructor creates a File that has an internal `_buffer`
    // which makes `arrayBuffer()` work. We use the standard pattern of
    // assigning to `input.files` via Object.defineProperty, then dispatching
    // a real `change` event (not via React's synthetic event system).
    Object.defineProperty(input, "files", { configurable: true, value: [png] });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await waitFor(() => expect(onFile).toHaveBeenCalledTimes(1));
    expect(onFile.mock.calls[0]?.[0]?.name).toBe("test.png");
  });

  it("rejects a JPEG with the educational error message", async () => {
    const onFile = vi.fn();
    render(<DropZone onFile={onFile} />);
    const jpeg = fileFromBytes(makeJpegBytes(), "photo.jpg", "image/jpeg");
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    changeInputFiles(input, [jpeg]);
    await waitFor(() => {
      expect(
        screen.getByText(/this isn't a png/i),
      ).toBeInTheDocument();
    });
    expect(onFile).not.toHaveBeenCalled();
  });

  it("rejects a file larger than maxSize with a size error", async () => {
    const onFile = vi.fn();
    render(<DropZone onFile={onFile} maxSize={100} />);
    const big = new File([new Uint8Array(200)], "big.png", { type: "image/png" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    changeInputFiles(input, [big]);
    await waitFor(() => {
      expect(screen.getByText(/exceeds the 25 mb maximum size/i)).toBeInTheDocument();
    });
    expect(onFile).not.toHaveBeenCalled();
  });

  it("shows a 'Pick another' button on validation failure", async () => {
    render(<DropZone onFile={() => undefined} />);
    const jpeg = fileFromBytes(makeJpegBytes(), "x.jpg", "image/jpeg");
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    changeInputFiles(input, [jpeg]);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /pick another file/i })).toBeInTheDocument();
    });
  });

  it("clears the error and announces the selection on a successful pick", async () => {
    const onFile = vi.fn();
    render(<DropZone onFile={onFile} />);
    // First pick a JPEG so the error state is set.
    const jpeg = fileFromBytes(makeJpegBytes(), "bad.jpg", "image/jpeg");
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    changeInputFiles(input, [jpeg]);
    await waitFor(() => screen.getByText(/this isn't a png/i));

    // Then pick a real PNG; the error should disappear.
    const png = fileFromBytes(makePngBytes(), "ok.png", "image/png");
    changeInputFiles(input, [png]);
    await waitFor(() => {
      expect(screen.queryByText(/this isn't a png/i)).not.toBeInTheDocument();
    });
    expect(onFile).toHaveBeenCalledTimes(1);
  });

  it("invokes onClear when the Clear button is clicked", async () => {
    const onClear = vi.fn();
    render(<DropZone onFile={() => undefined} onClear={onClear} fileName="test.png" />);
    const clearBtn = screen.getByRole("button", { name: /clear selection/i });
    fireEvent.click(clearBtn);
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("responds to Enter key by triggering the file picker (input.click)", () => {
    render(<DropZone onFile={() => undefined} />);
    const surface = screen.getByRole("button", { name: /drag and drop/i });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(input, "click");
    fireEvent.keyDown(surface, { key: "Enter" });
    expect(clickSpy).toHaveBeenCalled();
  });

  it("ignores key auto-repeat (holding Enter doesn't re-trigger)", () => {
    render(<DropZone onFile={() => undefined} />);
    const surface = screen.getByRole("button", { name: /drag and drop/i });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(input, "click");
    fireEvent.keyDown(surface, { key: "Enter", repeat: true });
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it("accepts dropped files via drag-and-drop", async () => {
    const onFile = vi.fn();
    render(<DropZone onFile={onFile} />);
    const surface = screen.getByRole("button", { name: /drag and drop/i });
    const png = fileFromBytes(makePngBytes(), "drop.png", "image/png");
    fireEvent.drop(surface, { dataTransfer: dataTransfer([png]) });
    await waitFor(() => expect(onFile).toHaveBeenCalledTimes(1));
    expect(onFile.mock.calls[0]?.[0]?.name).toBe("drop.png");
  });

  it("calls onFiles (not onFile) when multiple=true and a valid PNG is picked", async () => {
    const onFile = vi.fn();
    const onFiles = vi.fn();
    render(<DropZone onFile={onFile} onFiles={onFiles} multiple />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const png = fileFromBytes(makePngBytes(), "a.png", "image/png");
    changeInputFiles(input, [png]);
    await waitFor(() => expect(onFiles).toHaveBeenCalledTimes(1));
    expect(onFile).not.toHaveBeenCalled();
  });
});

