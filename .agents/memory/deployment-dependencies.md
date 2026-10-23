---
name: Deployment dependency installation
description: How to scope fixes for Python dependency errors during publishing.
---

When publishing fails during the automatic package-install phase, address the build's package-install environment rather than relying only on a custom build command or production-only environment variables.

**Why:** Build logs showed a disabled user-site pip install failing before the custom build phase began. A later publish still failed with the same error despite production-only pip overrides being saved. Do not repeat that production-only fix or claim it worked. Disabling user mode alone also exposed the immutable Nix system Python in a local dry run; a writable project-local dependency target was needed.

**How to apply:** Identify the failing phase from deployment build logs. Keep install destinations consistent with the runtime's Python import paths and version. Shared overrides are the next approach, documented in `replit.md`; they are not yet confirmed by a successful publish. A local dry run is not proof that a new publish succeeded.
