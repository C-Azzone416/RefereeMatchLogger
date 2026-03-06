# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is the **Referee** repository, which serves as a workspace managed by the [Clubhouse](https://github.com/clubhouse) agent manager. It is a host repository for Claude Code agents that are spawned and managed externally.

## Structure

- `.gitignore` — Excludes all agent-specific and local Clubhouse state from version control:
  - `.clubhouse/agents/` — Per-agent Claude Code session directories (including settings, memory, and worktrees)
  - `.clubhouse/.local/` — Local runtime state
  - `.clubhouse/agents.json` — Agent registry
  - `.clubhouse/settings.local.json` — Local Clubhouse settings

## How Agents Work

Each agent (e.g., `proud-toucan`) runs as an isolated Claude Code session under `.clubhouse/agents/<agent-name>/`. The agent's `.claude/settings.local.json` configures Claude Code hooks that forward all tool lifecycle events (`PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `Stop`, `Notification`, `PermissionRequest`) to a local Clubhouse HTTP server at `http://127.0.0.1:55669` for orchestration and monitoring.

The environment variables `CLUBHOUSE_AGENT_ID` and `CLUBHOUSE_HOOK_NONCE` are injected by the Clubhouse manager at runtime.
