#!/usr/bin/env bash
# Wrapper for obsidian-e2e when Obsidian is installed via Flatpak.
exec flatpak run md.obsidian.Obsidian "$@"
