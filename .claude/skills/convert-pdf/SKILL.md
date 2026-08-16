---
name: convert-pdf
description: >
  Convert PDF files to structured Markdown, preserving headings, tables, and lists.
  Trigger when a PDF needs to be ingested as readable text.
---

# convert-pdf

> Owned by **the-smith**（工坊）。進件 pipeline 的「②加工成 AI 好讀文件」步驟之一（PDF 專用；雜亂的非 PDF 文件用 [refine-doc](../refine-doc/SKILL.md)）。

## What it does

Reads a PDF file and converts it to a clean, structured Markdown (.md) file. Preserves heading hierarchy, tables, lists, and inline formatting. Handles large PDFs by processing in batches.

## When to trigger

- User provides a PDF that needs to be converted to editable text
- Ingesting external PDF documents into the knowledge base
- Preparing PDF content for further processing by other skills

## Rules

### DO

- Use the Read tool to read PDF content (max 20 pages per batch for large PDFs)
- Preserve document structure: headings, tables, ordered/unordered lists
- Remove headers, footers, and page numbers
- Add source metadata block at the top of the output file
- Ensure cross-page content continuity when processing in batches

### DO NOT

- Attempt OCR on scanned/image-based PDFs (notify user instead)
- Fabricate content not present in the source PDF
- Drop tables or convert them to plain text -- use proper Markdown table syntax

## Input

- `pdf_file_path` -- absolute path to the PDF file (required)
- `output_path` -- output .md file path (optional; defaults to same directory, same filename with .md extension)

## Output

A Markdown file with source metadata and converted content.

---

## Conversion Rules

| PDF Element | Markdown Output |
|-------------|----------------|
| Main title / cover title | `# Title` |
| Section heading | `## Title` |
| Subsection heading | `### Title` |
| Paragraph text | Normal paragraph (blank line separated) |
| Table | Markdown table syntax `| col |` |
| Bullet list | `- item` |
| Numbered list | `1. item` |
| Header / footer / page number | Remove |

## Large PDF Handling

- PDFs over 10 pages: read in batches (up to 20 pages each)
- Parse and merge output per batch
- Ensure cross-page content continuity

## Output Format

```markdown
# [Document Title]

> Source: [original PDF filename]
> Converted: [YYYY-MM-DD]
> Pages: [total pages]

---

[converted content]
```

## Limitations

- Scanned PDFs (image-based) cannot extract text directly -- prompt user for alternative
- Complex layouts (multi-column, floating images) may need manual adjustment
- Images are not extracted; position markers are left as `[Image: description]`
