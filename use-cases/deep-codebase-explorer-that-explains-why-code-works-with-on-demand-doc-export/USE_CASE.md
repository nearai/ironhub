### 1. Title

Deep codebase explorer that explains why code works, with on-demand doc export

### 2. Example prompt

Point this at a repo (GitHub URL or local path) and ask it things like "why does this auth flow work this way?" — get a clear inline answer, then optionally save it as Markdown docs.

### 3. What the agent does

The user provides a repo location (a GitHub URL or a local path). The agent indexes the codebase using a tree-sitter-style semantic parser so it understands structure, not just text.

The user can then ask free-form questions in chat: high-level ("what is the architecture of this project?"), module-level ("how does the auth flow work and why is it done this way?"), function-level ("walk me through this function and its edge cases"), or line-level ("what does this exact line do?"). The agent picks the right granularity based on the question, returns a clear inline answer in the chat, and after each answer asks the user if they want the explanation saved as Markdown docs (per-question file or a single growing doc — agent suggests the best shape). If the user says yes, it writes the docs into the repo (or a `docs/` folder) and confirms the path. Over time the user builds a navigable knowledge base of "why" answers for the repo.

### 4. Skills & tools used

- codebase-indexer — clone or read a repo (GitHub / local) and build a semantic index
- github — read remote repos via the GitHub API
- file-write — write generated Markdown docs back into the repo
- Tree-sitter language pack — pluggable parsers per language (PHP, JS/TS, Python, Rust, Go, etc.) so the indexer understands real syntax and AST, not just regex
- Dependency mapper — build a module / import / function-call graph from the parsed AST so the agent can answer "what depends on X?" and "where is Y used?"
- Doc exporter — turn an inline Q&A answer into a clean Markdown file with code blocks, headings, and links to source lines

### 5. Categories

- [ ] Personal assistant
- [ ] Web 3 / Crypto
- [x] Coding / dev workflow
- [x] Research
- [ ] Marketing / content
- [ ] Business ops
- [ ] Sales / CRM
- [x] Files / knowledge
- [ ] Automation
- [ ] Design / media
- [x] Skill creation

### 6. Source (optional)

Inspired by Kent's developer need: stop grepping, start asking a real "why" question about a repo and getting an answer that respects the code's structure.

### 7. Author (optional)

kent
