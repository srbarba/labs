# Métricas de ejecución

Registro incremental por fase. Se consolida en `RESULTS.md` en la Fase 9.

## Fase 0 — Control manual

- Ficheros de implementación del componente (`packages/ui-manual/src/action-button/`): 6
  (`types.ts`, `machine.ts`, `recipe.ts`, `action-button.tsx`, `index.ts`, `action-button.test.tsx`)
- Líneas de esos 6 ficheros: 245
- Ficheros de infraestructura compartida tocados (panda.config.ts, storybook config/stories, postcss): 7, 202 líneas
- Total repo-wide para tener el control funcionando: 13 ficheros, 521 líneas
- Stack real usado: `@zag-js/core` (API `setup`/`createMachine` v1, basada en schema), `@zag-js/react` (`useMachine`), `@pandacss/dev` (`defineSlotRecipe`), `@park-ui/panda-preset` (`createPreset` + paletas `blue`/`slate`), React 19, Storybook 10 (`@storybook/react-vite`), Vitest 4 + Testing Library + vitest-axe.
- Validación: `vitest run` (5/5 tests, incluye recorrido de los 5 estados + axe) y `storybook build` (compila stories + recipe + CSS extraído por PandaCSS vía postcss) pasan en verde.
- Fricciones de integración encontradas y resueltas (no relacionadas con la hipótesis, sino con el stack elegido):
  - TypeScript 7 eliminó `baseUrl` (usar solo `paths`).
  - `@park-ui/panda-preset` exige objetos de paleta reales (`import blue from ".../colors/blue"`), no strings.
  - `@pandacss/preset-base` / `@pandacss/preset-panda` deben declararse como dependencia directa del proyecto raíz para que Panda los resuelva (pnpm no los hoistea transitivamente).
  - Vite/ESM: `.storybook/main.ts` no tiene `__dirname`; hay que derivarlo de `import.meta.url`.
  - `vitest-axe@0.1.0` trae tipados de Vitest desactualizados (namespace `Vi.Assertion` en vez de `module "vitest" { interface Assertion }`); hubo que re-declarar la augmentación de tipos a mano en `vitest-matchers.d.ts`. Esto no afecta en tiempo de ejecución.
- Tiempo aproximado (agente, no humano): ~1h de esta sesión, incluyendo resolución de las fricciones anteriores.
