---
name: analyze-skill-quality
description: >
  Analyze and validate agent skill quality. Trigger when user mentions
  skill review, skill check, skill audit, analyze skill, validate skill,
  SKILL.md review, skill quality, improve skill, or any skill authoring needs.
---

# analyze-skill-quality

Validate a SKILL.md file against the Agent Skills standard. Report every finding with pass/fail/warning. Suggest fixes for each failure.

## Validation Rules

Run every check below in order. Report results as a checklist.

### 1. Structure Checks (errors)

- [ ] SKILL.md exists in skill folder
- [ ] Frontmatter: valid YAML between `---` markers
- [ ] Frontmatter: `name` field present
- [ ] Frontmatter: `description` field present
- [ ] Name: lowercase letters, digits, hyphens only
- [ ] Name: 64 characters or fewer
- [ ] Name: no reserved words (anthropic, claude)
- [ ] Name: no XML tags
- [ ] Name: verb + action format (e.g., handle-mysql, generate-finance-report, analyze-skill-quality). Omit words the agent already infers (e.g., "db" after "mysql")
- [ ] Description: non-empty, 1024 characters or fewer
- [ ] Description: no XML tags

### 2. Description Quality (warnings)

- [ ] States what the skill does (capability)
- [ ] States when to trigger (context/keywords)
- [ ] Lists user-facing trigger words (be pushy)
- [ ] Written in third person ("Processes files", not "I process files" or "You can process files")
- [ ] Specific enough to distinguish from other skills

Fail example: "Helps with databases"
Pass example: "Access and analyze MySQL databases. Trigger when user mentions database, query, store data, task progress, reports, statistics, analysis, overdue, or any structured data access needs."

### 3. Instructions Quality (warnings)

- [ ] Uses imperative mood (verb-first: "Execute", "Run", "Check")
- [ ] Instructions are specific, not vague
- [ ] Steps are sequential and numbered when order matters
- [ ] No unnecessary explanation of concepts the agent already knows — assume the agent is smart
- [ ] Body under 500 lines (move detail to references/)

Fail example: "Validate the data before proceeding"
Pass example: "Run the validation script. Confirm expected output format. If failure, check date format. Retry with corrected format."

### 4. Content Quality (warnings)

- [ ] No time-sensitive information (dates, versions that will expire)
- [ ] Consistent terminology (pick one term, use it everywhere)
- [ ] Examples are concrete with input/output pairs, not abstract
- [ ] Templates provided for structured output when applicable
- [ ] Rules separated into DO and DO NOT sections
- [ ] No hard coupling to a specific data source, tool, or environment unless the skill's sole purpose is that source. A skill that processes data should accept data from any source, not assume one (e.g., "database" when CSV/API/spreadsheet are equally valid)

### 5. File Organization (warnings)

- [ ] All paths use forward slashes (not backslashes)
- [ ] All paths relative to skill directory
- [ ] References one level deep from SKILL.md (no nested chains)
- [ ] Files named descriptively (not doc1.md, file2.md)
- [ ] Reference files over 100 lines include table of contents
- [ ] Progressive disclosure: core instructions in SKILL.md, detail in references/

### 6. Scripts (warnings, if scripts/ exists)

- [ ] Script files are executable (chmod +x)
- [ ] Scripts handle errors explicitly (not punt to agent)
- [ ] No magic constants (all values justified with comments)
- [ ] Required dependencies listed in SKILL.md
- [ ] Clear whether agent should execute or read each script

### 6b. npm Script Documentation (errors, if skill registers npm scripts in package.json)

- [ ] SKILL.md contains a "Usage" section documenting all npm scripts
- [ ] Every npm script has its command shown with example arguments
- [ ] Expected output or behavior described for each command
- [ ] Quick-reference table mapping command → one-line description
- [ ] Setup prerequisites listed (env vars, first-time config, dependencies)
- [ ] Link to setup guide (references/SETUP.md) if external registration or credentials are needed

Fail example: npm scripts exist in package.json but SKILL.md has no Usage section
Pass example: SKILL.md has "## Usage (npm scripts)" with command, example, and quick-reference table for every registered script

### 7. Freedom Calibration (advisory)

Assess each instruction block:

- High freedom (text guidance): valid approaches vary by context
- Medium freedom (pseudocode/params): preferred pattern exists, some variation acceptable
- Low freedom (exact script): operation is fragile, consistency critical

Flag mismatches: fragile operations with high freedom, or trivial decisions with low freedom.

## Output Format

Report results in this structure:

```
## Skill Analysis: <skill-name>

### Structure
- [PASS] SKILL.md exists
- [PASS] Valid frontmatter
- [FAIL] Name contains reserved word "claude" -> Rename to avoid reserved words
...

### Description
- [PASS] States capability
- [WARN] Missing trigger words -> Add keywords users might say
...

### Instructions
...

### Content
...

### Files
...

### Scripts
...

### Freedom Calibration
- Step 2 "Run exec-sql.js": LOW freedom (correct, fragile DB operation)
- Step 3 "Present results": HIGH freedom (correct, formatting varies by context)

### Summary
Errors: X | Warnings: X | Pass: X

### Suggested Fixes
1. [Priority] Description of fix
2. ...
```

## DO

- Check every rule in order, report every finding
- Provide specific fix suggestions with examples for each failure
- Read the full SKILL.md content before analyzing
- Read referenced files (references/, scripts/) to verify claims
- Compare description against actual skill capability
- Flag skills that over-explain what the agent already knows

## DO NOT

- Skip checks or summarize as "looks good"
- Report only failures without pass results
- Suggest changes that increase token count without clear value
- Add commentary beyond findings and fixes
- Assume scripts work without checking error handling
- Accept vague descriptions or instructions as passing

## References

- Anthropic best practices: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices
- Agent Skills standard: https://agentskills.io
- Anthropic skills repo: https://github.com/anthropics/skills
- Anthropic guide (PDF): https://resources.anthropic.com/hubfs/The-Complete-Guide-to-Building-Skill-for-Claude.pdf
