---
name: gsd:set-profile
description: Switch model profile for GSD agents (quality/balanced/budget/inherit)
argument-hint: <profile (quality|balanced|budget|inherit)>
model: opus
allowed-tools:
  - Bash
---

Show the following output to the user verbatim, with no extra commentary:

!`node "/Users/jamie/Jamie_Dev/claude_chat/.claude/get-shit-done/bin/gsd-tools.cjs" config-set-model-profile $ARGUMENTS --raw`
