# Repository instructions

For every Astro-related change, read and apply [.agents/skills/astro-performance/SKILL.md](.agents/skills/astro-performance/SKILL.md) before implementation.

Always consider performance during design and implementation. Preserve the requested visuals, original-photo fidelity, smooth motion, browser fallbacks, and accessibility. Prefer measured improvements over extra dependencies or speculative changes. Scale verification to the change.

Use the existing /workspace/portfolio checkout. Each cloud task is already isolated; do not create a Git worktree unless the user requests one.

The standard checks are ASTRO_TELEMETRY_DISABLED=1 npm run check and ASTRO_TELEMETRY_DISABLED=1 npm run cf:build. The site deploys as static assets to Cloudflare Workers through the main branch's GitHub Actions workflow using cf deploy --prebuilt.

Consult current official Astro documentation for unfamiliar or version-sensitive APIs. The Astro Docs MCP is an optional documentation source when configured, not a required credential or prerequisite for local development.
