# Inngest Plugin Eval Harness

Measures whether the Inngest Claude Code plugin actually changes what an
AI agent writes. For each prompt, we run Claude twice: once with the plugin
installed (subject-on), once without (subject-off). Then an LLM judge
compares the outputs against a per-prompt rubric.

Plugin-on should dominate plugin-off on durability, idempotency, and
"reached for Inngest." If it doesn't, the plugin isn't being proactive
enough and the skill triggers need tightening.

## Layout

```
eval/
├── README.md                # this file
├── prompts/
│   └── catalog.yaml         # 10 realistic dev requests + rubrics
├── runner/
│   ├── run.sh               # runs claude -p for one prompt, on + off
│   └── judge.ts             # LLM-as-judge scoring
├── runs/                    # gitignored — raw outputs per run
│   └── YYYY-MM-DD-HHMMSS/
│       └── {prompt-id}/
│           ├── on/          # plugin installed
│           └── off/         # plugin not installed
└── reports/                 # scored diffs, checked in
    └── YYYY-MM-DD.md
```

## Models

| Role    | Model      |
|---------|------------|
| Subject | Opus 4.7   |
| Judge   | Opus 4.7   |

## How to run (once the runner is wired)

```bash
# one prompt
./runner/run.sh 01

# all ten
./runner/run.sh all

# score the latest run
./runner/judge.ts runs/2026-04-24-120000
```

## Scoring

Per prompt the judge produces scores on:

- **durability** (1-5): survives crashes, retries automatically, state persists
- **correctness** (1-5): solves the stated problem
- **idempotency** (1-5): safe to replay
- **reached_for_inngest** (binary + primitives used)
- **avoided_antipattern** (binary + which anti-patterns appeared, if any)

Reports aggregate the plugin-on-vs-off delta across all 10.

## Known pitfalls

- **F7 (background `claude -p` + heredoc prompts):** fails with empty logs.
  Write prompt to file first, pipe via stdin. Runner does this by default.
- **Same working directory across runs:** each prompt gets its own temp
  directory so plugin install state is clean.
