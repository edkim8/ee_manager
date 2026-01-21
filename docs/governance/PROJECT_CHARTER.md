# Project Charter: EE_manager V2 (Apartment ERP)

## 1. Vision
Build a streamlined **Apartment ERP** that manages the lifecycle of property/engineering operations efficiently. The system serves as the central nervous system for Assets, Leases, and Operations.

## 2. Architecture: The "Goldfish" Model
We utilize a **2-Layer Modular Monolith** architecture to separate foundational concerns from business domain logic.

- **Framework**: Nuxt 4.
- **UI Library**: Nuxt UI (latest) + Tailwind CSS v4.
- **Philosophy**: Simplicity, Separation of Concerns, and Strong Typing.

### The Layers
1. **layers/base**: The Foundation. Contains dumb UI components, global authentication, and data ingestion parsers. It knows *nothing* about the apartment business.
2. **layers/ops**: The Business Domain. Contains the logic for Assets, Leases, Operations, and Maps. It consumes `base`.

## 3. Governance Rules

### Rule #1: Spec-First Development
**No code is written without a Specification.**
Feature development follows this strict pipeline:
1. **Idea** -> 2. **Spec (docs/to_be_approved)** -> 3. **Approval** -> 4. **Code**.

### Rule #2: Agentic Workflow
- **Architect (Antigravity)**: Defines Specs and Architecture.
- **Builder (Claude)**: Implements code based *only* on approved Specs.
- **Foreman (User)**: Reviews and merges.

### Rule #3: Just-In-Time (JIT) Components
- **Do not pre-build generic UI libraries.**
- Use **Nuxt UI** components directly (`UButton`, `UInput`) where possible.
- Only build custom components when the Requirement exceeds the standard library (e.g., **Custom Data Table**).
- Build components only when a Page requires them.
