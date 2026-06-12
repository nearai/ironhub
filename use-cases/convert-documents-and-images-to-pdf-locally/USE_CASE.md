### 1. Title

Convert documents and images to PDF locally

### 2. Example prompt

"Convert these three scanned JPEGs into a single PDF, and also turn this Word document into a PDF — all without uploading anything to an external service."

### 3. What the agent does

Uses Stirling PDF's local API to convert images (JPG, PNG, TIFF, WebP) and documents (Word, PowerPoint, HTML, and more) into PDFs entirely on your own machine. No file ever leaves your system — Stirling PDF runs as a self-hosted Docker container or desktop app and exposes a REST API that the agent calls directly.

The agent handles single files or batches, and can chain conversions into further PDF operations: merge pages, compress output, add page numbers, or apply OCR. This makes it the go-to approach for converting sensitive documents (contracts, medical records, ID scans) that you'd normally have to upload to an online converter.

Run Stirling PDF locally in one command:
```
docker run -p 8080:8080 docker.stirlingpdf.com/stirlingtools/stirling-pdf
```
Then ask the agent to convert any file — it will call the local API at `http://localhost:8080`.

### 4. Skills & tools used

- Stirling PDF (local REST API) — self-hosted PDF platform with 50+ tools; handles image-to-PDF, document-to-PDF, merge, compress, OCR, and more without any external upload (https://github.com/Stirling-Tools/Stirling-PDF)
- File read/write — reads source files from disk and saves the resulting PDF locally

### 5. Categories

- [x] Personal assistant
- [ ] Web 3 / Crypto
- [ ] Coding / dev workflow
- [ ] Research
- [ ] Marketing / content
- [ ] Business ops
- [ ] Sales / CRM
- [x] Files / knowledge
- [ ] Automation
- [ ] Design / media
- [ ] Skill creation

### 6. Source (optional)

https://github.com/Stirling-Tools/Stirling-PDF

### 7. Author (optional)

mr.potato
