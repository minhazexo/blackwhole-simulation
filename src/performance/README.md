# Performance Module

Runtime performance tooling for the black hole simulation: live frame
monitoring, one-shot benchmarking, and stress testing.

## Modules

| File            | Exports                                              | Purpose                                                        |
| --------------- | ---------------------------------------------------- | -------------------------------------------------------------- |
| `monitor.ts`    | `PerformanceMonitor`, `PerformanceMetrics`           | Live FPS / frame-time tracking, warnings, validation reports   |
| `benchmark.ts`  | `BenchmarkController`, `BenchmarkReport`             | Scripted benchmark runs with progress + completion callbacks   |
| `stress-test.ts`| `runStressTest`, `StressTestResult`                  | Hardware stress test used by the system-profile loading gate   |

## Usage

```typescript
import { PerformanceMonitor } from "@/performance/monitor";
import { BenchmarkController } from "@/performance/benchmark";
import { runStressTest } from "@/performance/stress-test";

const monitor = new PerformanceMonitor();
monitor.beginFrame();
// ... render ...
monitor.endFrame();
console.log(monitor.getMetrics().averageFPS);
```

## Tests

Unit tests live under `src/__tests__/performance/` (`benchmark.test.ts`,
`monitor.test.ts`) and run with the default suite:

```bash
bun run test
```

## Full strategy

See [`docs/PERFORMANCE.md`](../../docs/PERFORMANCE.md) for targets
(75 FPS baseline, 60 FPS mobile, 120 FPS desktop), the adaptive-quality
system, and TAA/uniform-batching optimizations.
