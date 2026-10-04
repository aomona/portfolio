---
name: astro-performance
description: Use for every Astro change in this repository. Preserve the portfolio's visual behavior and original photograph while reviewing browser performance, image delivery, fonts, accessibility, static output, caching, and proportionate validation.
---

# Astro performance

Apply performance judgment throughout implementation, including small UI edits. Make the simplest improvement justified by the actual change. Do not add unrelated dependencies or expand a small task into a broad rewrite.

## Establish the current workflow

- Read package.json, package-lock.json, astro.config.mjs, and affected source before editing. Use the repository's pinned versions and existing checkout; do not create worktrees unless requested.
- This project uses Astro static output and Cloudflare Workers static assets. The pinned cf CLI deploys prebuilt output. Preserve static rendering unless the requested feature requires server behavior.
- Check current Astro APIs against official documentation. Prefer the Astro Docs MCP server if it is available. Otherwise consult the official docs directly; do not invent API support from memory or claim an MCP server is installed.
- Use astro add for a requested official integration, and the package manager for other dependencies. Preserve the lockfile and use npm ci for repeatable installs.

## Review performance as you implement

- Ship HTML and CSS by default. Add browser JavaScript or a client framework only when the interaction needs it. Choose client hydration directives according to when that island is actually needed.
- Keep the initial view responsive. Check requested resources, CSS and JavaScript size, layout shifts, and main-thread work when relevant. Distinguish emitted assets from resources a browser actually downloads.
- Preserve the supplied original photo public/images/FP002119.JPG. Do not generate or reconstruct its face, cable, buildings, or background. Create derived formats from the original without changing the composition.
- Maintain AVIF → WebP → JPEG fallback, accurate image dimensions, and high priority for the hero image. Do not lazy-load the initial hero. Avoid preloading all three formats or reducing the zoom image's resolution simply to improve a score.
- Consider separate initial-view and zoom-resolution images for a measured loading bottleneck, but preserve final zoom quality and verify a seamless transition. Account for object-fit: cover and device pixel ratio when choosing image sizes.
- Load only the font families, weights, and character sets actually used. Keep font-display: swap and Japanese system fallbacks. Validate visual output after changing fonts.
- For motion, use requestAnimationFrame and frame-rate-independent damping. Avoid layout reads inside scroll handlers and repeated DOM writes when values are unchanged. Stop scheduling frames when settled, and release will-change after animation.
- Preserve the flow: fullscreen photo → cable zoom → frame/header reveal → lower content. Check reverse scrolling, viewport changes, keyboard focus, and prefers-reduced-motion. Do not introduce scroll locking.
- Apply immutable long-lived caching only to content-hashed URLs. Do not give HTML or fixed-name photos immutable caching that hides subsequent deployments.

## Verify and report proportionately

Run relevant checks from /workspace/portfolio with ASTRO_TELEMETRY_DISABLED=1:

```sh
npm run check
npm run cf:build
```

For interactive changes, inspect the actual page in a browser at desktop and mobile viewport sizes. Exercise the behavior that changed, its reverse path, reduced motion, and any affected image fallback. Use the dev server's /_astro/status for readiness and a real page request for functional validation; a running process alone is insufficient.

Use a focused before/after measurement for performance claims. Record the operation, viewport, and limits of that measurement. Mutation counts or build sizes do not establish a Lighthouse score, Core Web Vitals, memory savings, or field performance. Do not claim faster loading without measuring loading.

Do not create implementation-mirroring tests or repeat unrelated suites for documentation-only changes. Describe what changed, what was actually checked, and any unresolved limitation. Follow the user's current branch, merge, and deployment instructions; this skill itself does not grant publication authority.

## Official references

- [Building with AI tools](https://docs.astro.build/en/guides/build-with-ai/)
- Astro Docs MCP: https://mcp.docs.astro.build/mcp (Streamable HTTP; use when available)
- [Images](https://docs.astro.build/en/guides/images/)
- [Client directives](https://docs.astro.build/en/reference/directives-reference/#client-directives)
- [Scripts and event handling](https://docs.astro.build/en/guides/client-side-scripts/)
- [Analyze bundle size](https://docs.astro.build/en/recipes/analyze-bundle-size/)

These are documentation sources, not proof that any particular optimization works in this repository. Verify behavior against the installed Astro version and actual browser output.
