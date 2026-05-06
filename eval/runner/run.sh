#!/usr/bin/env bash
# TODO: implemented in the next sprint task.
#
# Plan:
# 1. Read catalog.yaml. Select prompt(s) by id or "all".
# 2. For each prompt, create two temp dirs:
#      runs/<timestamp>/<prompt-id>/on/
#      runs/<timestamp>/<prompt-id>/off/
# 3. In the "on" dir, install the Inngest plugin (or seed with plugin skills).
#    In the "off" dir, leave clean.
# 4. Write prompt text to a file (F7 workaround — heredoc fails in background).
# 5. Run `cat prompt.txt | claude -p --model opus-4.7` in each dir, in parallel.
# 6. Capture stdout + any files the agent created.
# 7. Exit. Judge consumes the outputs separately.

set -euo pipefail
echo "runner not yet implemented — see catalog.yaml and README.md"
exit 1
