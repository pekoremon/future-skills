---
name: Deployment dependency installation
description: How to scope fixes for Python dependency errors during publishing.
---

When publishing fails during the automatic package-install phase, address the build's package-install environment rather than relying only on a custom build command or production-only environment variables.

**Why:** Build logs showed a disabled user-site pip install failing before the custom build phase began. Subsequent publishes failed identically with both production-only and shared pip overrides saved. Do not repeat either environment-only fix or claim it worked. Disabling user mode alone also exposed the immutable Nix system Python in a local dry run; a writable project-local dependency target was needed.

**How to apply:** Identify the failing phase from deployment build logs. Official configuration documentation supports skipping the automatic hosting installer with `packager.features.enabledForHosting=false`; use an explicit build command with inline pip overrides and a writable target instead. That approach passed a local dry run under conflicting inherited settings but has not yet been confirmed by a successful publish. See `replit.md` for current configuration. A local dry run is not proof of deployment success.
