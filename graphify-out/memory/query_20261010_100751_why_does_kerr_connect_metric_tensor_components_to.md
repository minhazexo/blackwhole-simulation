---
type: "query"
date: "2026-10-10T10:07:51.483014+00:00"
question: "Why does Kerr connect Metric Tensor Components to Hamiltonian Mechanics, ISCO Plunge Orbits, Lensing Shadow Optics, Frame Dragging Field, Bekenstein Entropy Tests?"
contributor: "graphify"
outcome: "useful"
source_nodes:
  ["Kerr", "GeodesicState", "Metric", "bekenstein_hawking_entropy_per_kb"]
---

# Q: Why does Kerr connect Metric Tensor Components to Hamiltonian Mechanics, ISCO Plunge Orbits, Lensing Shadow Optics, Frame Dragging Field, Bekenstein Entropy Tests?

## Answer

Expanded from original query via vocab: [kerr, metric, hamiltonian, geodesic, isco, shadow, lensing, dragging, entropy, bekenstein, horizon, photon]. Traversed: explain Kerr node + undirected shortest paths Kerr-isco (1 hop, method edge), Kerr-hamiltonian (3 hops via normalize.rs and GeodesicState), Kerr-frame_drag (1 hop, imports_from), Kerr-Bekenstein (4 hops via horizon_area_geometric and bekenstein_hawking_entropy_per_kb), plus BFS depth-2 subgraph (275 nodes). Finding: the Kerr struct in physics-engine/gravitas-core/src/metric/kerr.rs is the single geometry provider every physics module consumes - it implements Metric, exposes isco/a/new/covariant/contravariant, and is referenced by plunge, disk, shadow, magnetosphere, frame_drag, bekenstein, and the WASM PhysicsEngine.

## Outcome

- Signal: useful

## Source Nodes

- Kerr
- GeodesicState
- Metric
- bekenstein_hawking_entropy_per_kb
