# 立教数学 固定類題Bank v0.1 QA

- 全60問: L2 40 / Clean Transfer 10 / Retention 10
- 10 family × 6問（L2×4 + Transfer×1 + Retention×1）
- 正答: 独立解答 + SymPy/公式による別検算 60/60 PASS
- deterministic scorer canonical testへ統合
- 公式解答は存在しないため、内部Answer Authorityを使用

## Clean Transfer監査
- `PB-CALCULATION_FLUENCY-TRANSFER-01`: LOW — Radical quotient/sum transfer; no copied exam section or diagram.
- `PB-ALGEBRA_MANIPULATION-TRANSFER-01`: LOW — Expansion cancellation identity; independent surface from past-exam factoring/expansion items.
- `PB-EQUATION_SOLVING-TRANSFER-01`: LOW — Rectangle-area word equation with an explicit domain condition; not derived from a holdout prompt.
- `PB-FUNCTION_CORE_AND_TRANSFER-TRANSFER-01`: LOW — Horizontal line–parabola chord distance; unlike FY26 coordinate-area/parallel-form sections.
- `PB-PLANE_GEOMETRY-TRANSFER-01`: LOW — Isosceles-altitude angle relation; independent of known midpoint/trisection near-duplicate family.
- `PB-CIRCLE-TRANSFER-01`: LOW — Center-to-chord distance via perpendicular bisector; different from FY26 arc/inscribed-angle slot.
- `PB-SIMILARITY_AND_RATIO-TRANSFER-01`: LOW — Similar rectangles using perimeter-to-area scaling; no exam diagram copy.
- `PB-SOLID_GEOMETRY-TRANSFER-01`: LOW — Triangular-prism volume; deliberately avoids FY26 rectangular-prism diagonal and tetrahedron structures.
- `PB-MEASUREMENT-TRANSFER-01`: LOW — Rectangle plus external semicircle; only skill-level overlap with composite-measurement items, no diagram/numeric copy.
- `PB-PROBABILITY_NUMBER_DATA-TRANSFER-01`: LOW — Without-replacement colored-ball combination; avoids the repeated two-dice structures.

## 制限
- これは最初のmastery-enabling trancheであり、Learning Design Freezeの最終Bank目標数すべてではない。
- 図形類題は今後、図の表面形式をさらに増やす。
- Retentionはfamilyあたり1問なので、次版で複数variantへ拡張する。