---
name: product-research
description: Research comparable products, proven workflows, and interface patterns to inform Household Finance product, UX, and architecture decisions. Use before deciding how a new or unclear capability should work; do not use for routine implementation or code review.
---

# Product Research

Research relevant, well-established products and real user-facing patterns before recommending a product, interface, or architecture direction. The goal is evidence-informed decisions for Household Finance, not copying another product.

## Workflow

1. **Frame the decision.** State the question being decided, intended users, relevant household-finance context, constraints, and what a useful answer must resolve. Ask for clarification only if a missing constraint would change the research materially.
2. **Select comparable systems.** Choose direct competitors and useful adjacent products based on the decision. Explain why each is comparable. Treat “successful” as a claim to verify using relevant evidence such as longevity, adoption, product maturity, credible customer evidence, or documented outcomes; do not infer success from a polished marketing site alone.
3. **Research current evidence.** Browse current public sources. Prefer first-party product pages, help centers, official docs, release notes, and publicly accessible product screens for product behavior. Use credible independent sources for adoption, reputation, or outcomes. Cite links close to claims and note publication/access dates when timing matters.
4. **Inspect UI and workflows where possible.** Use public, accessible screens, official demos, or documented flows. Describe observed hierarchy, navigation, terminology, forms, feedback, empty/loading/error states, responsive behavior, and accessibility signals only when visible in the evidence. Do not bypass authentication or paywalls, create accounts, contact companies, or use private data without authorization. If a product screen cannot be inspected, say what the evidence actually supports.
5. **Compare and interpret.** Separate observed facts from your inferences. Identify recurring patterns, meaningful differences, and anti-patterns. Explain whether each pattern transfers to this product, considering household privacy and authorization, Romanian context and RON, usability, accessibility, implementation cost, and operational/security implications where relevant.
6. **Inform the decision.** Present a small set of viable options, with evidence, fit, trade-offs, risks, and confidence. Recommend a direction only when the evidence and stated constraints support one. Leave product policy or architecture decisions unapproved until the user or responsible project role accepts them.

## Output

Write a concise research brief containing:

- **Decision question and scope**
- **Comparable products and why they were selected**
- **Comparison table** with relevant behaviors or UI patterns, evidence, and fit
- **Observed patterns, differences, and risks**, clearly separating facts from inference
- **Recommendation or options** with trade-offs and confidence
- **Sources and research limitations**, including any products or screens that could not be inspected

Use citations for web-derived claims. Avoid unsupported rankings, vague claims that a product is “best,” and treating popularity as proof that a pattern fits this project. Use Hungarian by default for user-facing briefs.
