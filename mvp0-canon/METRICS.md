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

## Fase 1 — Esquema del canon

- `spec/schema/component.schema.ts`: 63 líneas, define `ComponentSpec` (Zod, `.strict()`) cubriendo anatomy/states/transitions/events/context/visual/a11y tal como pide la sección 6.
- `packages/compiler/src/load.ts`: parseo + errores legibles (`SpecValidationError`, un mensaje por issue con ruta de campo).
- `packages/compiler/src/verify.ts`: ya contiene las 6 reglas de completitud de la Fase 7 (se implementaron juntas por eficiencia; se validan con fixtures rotos en la Fase 7).
- `packages/compiler/src/index.ts`: CLI (`verify` / `generate`) — `generate` delega en `emit/*` (stubs `throw "not implemented"` hasta que cada Fase 3-6 los rellene).
- Test (`load.test.ts`, 10 casos): un ejemplo válido + 4 variantes malformadas (sin estados, propiedad visual no reconocida, campo desconocido en modo strict, referencia de token que no es un dot-path) — todas rechazadas con mensajes accionables.
- Fricción real de Zod 4: `z.record(enumSchema, valueSchema)` es **exhaustivo** (exige todas las claves del enum), no parcial — hubo que usar `z.partialRecord` para `visual.<state>.<part>`. Sin este ajuste, cualquier estado que no pintara las tres propiedades visuales (`backgroundColor`/`color`/`borderColor`) habría sido rechazado por el propio esquema, no por el verificador — sería el verificador equivocado dando el error equivocado.
- `zod-to-json-schema` (dependencia listada en la sección 5) resultó incompatible con Zod 4 (su tipado espera la jerarquía de clases de Zod v3). Se sustituyó por `z.toJSONSchema()`, nativo de Zod 4 desde esta versión — se elimina la dependencia externa en vez de forzarla.

## Fase 2 — Especificación de ActionButton

- `spec/components/action-button.spec.json`: 81 líneas. Cubre la tabla completa de la sección 3: 5 estados, 8 transiciones (incluida la temporizada `success --AFTER(successDuration)--> idle` y la ausencia deliberada de `CLICK` en `pending`), 6 eventos, 2 campos de contexto, `visual` para los 5 estados × 3 partes, y el bloque `a11y` completo.
- Comparación con la implementación manual: 81 líneas de spec frente a 240 líneas en los 4 ficheros manuales equivalentes (`machine.ts` + `types.ts` + `recipe.ts` + `action-button.tsx`) — la spec es ~3× más corta que lo que reemplaza. No hay señal temprana de falsación por longitud/legibilidad.
- `pnpm verify` pasa en verde contra el fichero real: válido contra el esquema Zod y contra las 6 reglas de completitud de `verify.ts` a la primera.
- Decisión de modelado: la guarda `!disabled` de la tabla se codifica como el string `"!disabled"` en `transitions[].guard` — sigue siendo dato (una referencia a un campo de contexto con negación por convención), no una función; el compilador decide cómo interpretarla.

## Fase 3 — Destino 1: máquina Zag generada

- `packages/compiler/src/naming.ts`: convenciones de nombres compartidas entre emisores (pascalCase, nombre de evento/efecto de timeout, nombre de guarda a partir de `"!campo"`).
- `packages/compiler/src/emit/machine.ts` (155 líneas): genera `types.ts` (interfaz `<Nombre>Schema` para `setup<T>()`) y `machine.ts` (config de `createMachine`) puramente a partir de `states`, `transitions`, `context` y `events` de la spec. Cabecera `// GENERATED — DO NOT EDIT` en ambos.
- Suite de comportamiento compartida (`test/shared/action-button-machine.behavior.ts`, 7 casos) extraída de la tabla de la sección 3: recorre exactamente las transiciones declaradas (incluida la ausencia de `CLICK` en `pending`) usando `@zag-js/react`'s `useMachine` vía `renderHook`. Se ejecuta sin cambios contra `packages/ui-manual` (control) y contra `packages/ui` (generado) — **7/7 en ambos**, mismo fichero de aserciones.
- Divergencia real encontrada y documentada (no oculta): el control manual added una conveniencia no declarada en la spec — `initialState` arranca directamente en el estado `disabled` si `disabled: true` se pasa en la construcción, evitando pasar por el evento `DISABLE`. La spec solo declara qué estado es `initial` (siempre `idle`); el generador es fiel a eso y **no** replica el atajo. Se ajustó el único test que dependía de esa conveniencia para comprobar la garantía real que sí promete la spec ("nunca se alcanza `pending` estando `disabled: true`"), válida en ambas implementaciones por caminos distintos. Esto es exactamente el tipo de hallazgo que la Fase 9 pide registrar bajo "qué no cupo en la especificación".
- Fricción de test (no de la hipótesis): un `successDuration` corto (20 ms) en el test de la transición temporizada podía ser menor que el intervalo de polling por defecto de `waitFor` (50 ms) de Testing Library, haciendo que el estado intermedio `success` se "saltara" entre dos sondeos aunque la máquina sí pasara por él. Se corrigió subiendo el valor a 200 ms en los tests (no en la spec ni en la máquina) — puramente un artefacto de cómo se observa el comportamiento, no un bug de `@zag-js/core` ni del generador.
- Ubicación de los tests del generado: viven en `test/generated/`, fuera de `packages/ui/`, porque `packages/ui` se borra y reconstruye entero en cada `pnpm generate` (regla de la sección 4) — nada escrito a mano puede vivir dentro.
