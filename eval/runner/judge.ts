// TODO: implemented in the next sprint task.
//
// Plan:
// 1. Arg: path to runs/<timestamp>/ directory.
// 2. For each prompt subdir, load:
//      - catalog.yaml entry (prompt, targets, rubric)
//      - on/ output (agent's full response + created files)
//      - off/ output (same)
// 3. Call Opus 4.7 with a judge prompt:
//      "Given this dev request, these two candidate solutions (A and B),
//       and this rubric, score each on the rubric dimensions. Surface the
//       key diff. Output JSON."
// 4. Blind A/B: randomize which is "on" and which is "off" in the judge
//    prompt to avoid bias, un-blind when scoring.
// 5. Aggregate across prompts. Write reports/<timestamp>.md with:
//      - per-prompt scores + narrative diff
//      - aggregate plugin-on-vs-off delta per rubric dimension
//      - flagged prompts where plugin-on did NOT win (signal to tighten triggers)

throw new Error("judge not yet implemented — see catalog.yaml and README.md");
