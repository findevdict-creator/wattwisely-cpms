# Working in this repository

Read this before creating a branch or opening a pull request. It applies to people and to Claude Code sessions alike.

## Branch names

Every branch is named `NN-module/<slug>`:

- `NN` is the two-digit module number: `01` to `19` so far, `20` for the next module.
- `<slug>` is the kebab-case name of the module's document in `docs/modules/`, without the number and the `.md`. Module 3's document is `3-sites-chargers.md`, so its branch is `03-module/sites-chargers`.
- A fix or follow-up to a module that already shipped keeps that module's prefix: `05-module/fix-tariff-gap`, `01-module/fix-local-trial`.
- Work that belongs to no single module (docs, CI, tooling, dependency updates) uses `00-module/<slug>`: `00-module/branch-naming-convention`.
- `review/module-NN` is a read-only snapshot of a module's tip, moved by hand after a review. Never commit to it.

The CI check `.github/workflows/branch-name.yml` fails a pull request whose head branch does not match `NN-module/<slug>`.

## Pull requests

- One module per pull request, from its `NN-module/<slug>` branch.
- A module that builds on a module that is not merged yet bases its branch and its pull request on that module's `NN-module/...` branch, so the stack merges in order. When the lower pull request merges into `main`, GitHub retargets the next one by itself.
- The first line of the title names the module: `Module 12: hardening and operations`.

## Claude Code sessions

A session is assigned a branch named `claude/project-thread-<id>`. Do not push to it. Before the first push:

```sh
git checkout -b NN-module/<slug>
git push -u origin NN-module/<slug>
```

Open the pull request from `NN-module/<slug>`. This file is standing permission to push to any branch that matches the pattern above; no further permission is needed.

## Code conventions

The rules the build enforces (class-only files, file and method size limits, the layer order, `snake_case` only in DTOs) are listed in [README.md](README.md) under "Coding standards".
