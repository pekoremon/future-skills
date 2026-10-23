---
name: Deployment dependency installation
description: How to scope fixes for Python dependency errors during publishing.
---

When publishing fails during the automatic package-install phase, address the production package-install environment rather than relying only on a custom build command.

**Why:** Build logs showed a disabled user-site pip install failing before the custom build phase began. Disabling user mode alone then exposed the immutable Nix system Python in a local dry run; a writable project-local dependency target was also needed.

**How to apply:** Identify the failing phase from deployment build logs. Keep install destinations consistent with the runtime's Python import paths and version. Current production settings are documented in `replit.md`. A local dry run is not proof that a new publish succeeded.
