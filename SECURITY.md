# Security

## Supported versions

`0.1.x` is the current development line. Only the latest `main` branch is maintained.

## What this app stores

opennbLM is local-first. Notebooks, chat, and teaching notes live in Electron `userData` (SQLite). Optional items:

- Encrypted Hugging Face token for Rumik Remote (`safeStorage`)
- Rumik mode preference
- Teaching-brain selection (CLIs and local servers you already run)

The renderer never receives Node APIs. Do not add IPC that exposes arbitrary filesystem or shell access.

## Reporting a vulnerability

Please **do not** open a public issue for a security problem.

Use GitHub **Security → Report a vulnerability** on [manasdutta04/opennbLM](https://github.com/manasdutta04/opennbLM/security/advisories/new), or email the maintainer listed on the GitHub profile.

Include:

- Affected commit or release
- Steps to reproduce
- Impact (data leak, RCE, token theft, etc.)

We will acknowledge the report and work on a fix before any public write-up.

## Out of scope

- Quality of third-party teaching brains or Rumik speech
- ZeroGPU quota or Hugging Face Space outages
- Models and CLIs the user installs themselves
