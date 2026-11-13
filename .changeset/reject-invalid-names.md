---
"sops-env": patch
---

Reject variable names that are not ASCII shell identifiers, such as `A=B`, which were printed as ambiguous lines.
