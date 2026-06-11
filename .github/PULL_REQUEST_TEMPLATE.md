## Summary

What this PR adds, changes, or removes. One paragraph.

## Closes

Closes #

## Type

- [ ] Use case
- [ ] New tool
- [ ] New skill
- [ ] Bug fix
- [ ] Documentation / process
- [ ] Infrastructure

## Artifact checklist

Use case PRs:

- [ ] Adds or updates `use-cases/<slug>/USE_CASE.md`
- [ ] Uses the exact seven-section `USE_CASE.md` template
- [ ] Uses strict skill/tool rows: `- name — description`
- [ ] Selects at least one category
- [ ] Passes `node scripts/validate-use-cases.mjs`

Skill PRs:

- [ ] Adds or updates `skills/<skill-name>/SKILL.md`
- [ ] Documents required tool dependencies
- [ ] Includes activation behavior in `SKILL.md`
- [ ] Tests at least one prompt that should activate the skill

Tool PRs:

- [ ] Adds or updates `tools/<tool-name>/README.md`
- [ ] Adds or updates `tools/<tool-name>/<tool-name>-tool.capabilities.json`
- [ ] Documents auth, scopes, limits, and target use cases
- [ ] Tests representative action calls and records the results below

Docs/process PRs:

- [ ] No `tracking.md` or README shipped-catalog change is needed
- [ ] Or, shipped catalog changes are reflected in both `tracking.md` and README

## Testing

List the commands or manual checks run. For tools, include action calls and returned behavior. For skills, include prompts tested and activation behavior. For use cases, include the validator result.
