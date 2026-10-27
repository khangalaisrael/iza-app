# Reverse engineering with REA (saved for later)

Repo: https://github.com/morluto/rea  (MIT licence)
Site: https://rea.tools/
npm package: `rea-agents` (6.8.0 when checked on 2026-10-27, repository points to the repo above)

## What it is

A toolkit that lets an agent investigate how an existing app or website works
without its source code, show the evidence, and then help build our own version
of the feature. It covers JavaScript and Electron apps, websites, native
binaries and .NET assemblies. Analysis runs locally.

## Two ways to use it

1. Terminal, no setup (preferred, changes no settings):

   ```bash
   npx -y rea-agents@latest analyze-javascript-application /absolute/path/to/app --json
   ```

   Needs Node.js. Works on an extracted JavaScript or Electron app folder or an ASAR file.

2. Full setup (edits the agent's configuration, so ask before doing this):

   ```bash
   npx rea-agents setup
   ```

   Registers REA as an MCP tool and installs workflow instructions. Restart the agent afterwards.

## Example prompt

> Understand how live tracking works in <app>, show me the evidence, and build a
> similar feature for Iza.

## Rules we agreed to follow

- Study how a feature works, then build our own version. Do not copy another
  company's code, branding or assets.
- Only inspect apps and sites we are allowed to look at. Check their terms first.
- Read the code before trusting it: the repo shows about 397,000 stars, which is
  unusually high and not verified.

## Still to decide

- Which app or feature to analyse first (nothing has been run yet).
- Terminal use only, or full setup.
