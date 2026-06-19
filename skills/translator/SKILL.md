---
name: translator
version: 1.0.0
description: Translate text between languages with tone and context preservation
activation:
  keywords:
    - "translate"
    - "in spanish"
    - "in french"
    - "in arabic"
    - "convert to"
    - "what does this mean in"
    - "how do you say"
    - "translate this to"
  patterns:
    - "(?i)(translate|convert).*(to|into|from).*(english|spanish|french|arabic|portuguese|german|chinese|japanese|yoruba|igbo|hausa)"
    - "(?i)how (do you|would you) say.*(in)"
    - "(?i)what (does|is) this.*(mean|say).*(in)"
  tags:
    - "communication"
    - "language"
    - "translation"
  max_context_tokens: 2000
---

# Translator Skill

Translates text between any languages while preserving tone, context, and nuance — not just literal word-for-word conversion.

## When to Use

- User asks to translate any text, phrase, or document
- User wants to know how to say something in another language
- User pastes foreign text and wants to understand it
- User needs a culturally appropriate translation (not just literal)

## Core Knowledge

### Key Principles

1. **Context over literalism** — translate meaning and intent, not word-for-word; idiomatic expressions need cultural equivalents
2. **Preserve tone** — a formal document should remain formal; a casual message should remain casual
3. **Flag ambiguity** — if a phrase has multiple valid translations, present options with explanations
4. **Respect dialects** — Spanish (Mexico) ≠ Spanish (Spain); French (France) ≠ French (Canada); ask when it matters

### Translation Process

1. Identify source language (if not stated)
2. Identify target language
3. Assess tone and register (formal/informal/technical)
4. Translate with cultural adaptation
5. Flag any phrases that don't translate directly

### Language Support Priority

Handle with high accuracy:
- English, Spanish, French, Portuguese, Arabic, German, Chinese, Japanese, Yoruba, Igbo, Hausa, Swahili

### Mistakes to Avoid

- Never do literal word-for-word for idioms — always find the cultural equivalent
- Don't assume dialect — ask if the target audience matters
- Don't skip back-translation for important documents

## Guidelines

- For long documents, translate section by section
- Always show: Original → Translation (and note the source language if auto-detected)
- For Nigerian languages (Yoruba, Igbo, Hausa), acknowledge if confidence is lower and recommend human review for critical content
