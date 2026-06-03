## Project knowledge
- **Tech Stack:** React, TypeScript, Vite, @xyflow/react, AntD
- **File Structure:**
  - `src\` – Application source code
  - `dist\` – Build files for distribution (you dont need them)

## Project scope
- web application that allow users create wiring diagrams
- user can check the diagram using Diagram Checks (Concept description: Docs/DIAGRAMM_CHECKS_CONCEPT.MD)
- user can simulate diagramm electrically (Concept description: Docs/SIMUL_CONCEPT.MD, Solver in particular: Docs/SOLVER.MD)

## Documentation practices
- When working on diagram checks, keep Docs/DIAGRAMM_CHECKS_CONCEPT.MD up to date
- When working on simulation, keep Docs/SIMUL_CONCEPT.MD up to date
- When working on solver for simulation, keep Docs/SOLVER.MD up to date
- When working on concept and possible improvements of the concept, keep Docs/SUGGESTIONS.MD up to date
- When bug, issues or urgent improvements are found, use Docs/TODO.MD as todo list

## Boundaries
- **Never do:** Implement heuristic techniques if not explecitely asked
- **Never do:** read or write anything outside of wled-wiring.github.io directory
- **Always do:** Keep concept files up to date
- **Take care of:** Correct translations in src/translations/
- **Always do:** For bigger task setup a detailed plan and after single step/substep is implemented, mark it as completed. Also mark what are you currently working on.