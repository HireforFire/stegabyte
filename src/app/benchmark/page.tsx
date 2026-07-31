import { BenchmarkPage } from "@/features/benchmark/benchmark-page";

export const metadata = {
  title: "Benchmark",
  description: "Stegabyte WASM vs JS performance benchmark",
};

export default function Page() {
  return <BenchmarkPage />;
}
