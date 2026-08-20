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

## Fase 4 — Destino 2: componente Park UI + tokens

- `emit/panda-preset.ts` (146 líneas): convierte el árbol DTCG completo (`tokens/tokens.json`) al formato de tokens de Panda (`color→colors`, `radius→radii`, `space→spacing`, `fontSize→fontSizes`; `$value`→`value`) y genera un slot recipe (`defineSlotRecipe`) a partir de `anatomy` (slots) + `visual` (variantes de color por estado).
- `emit/component.ts` (105 líneas): genera el componente React (`forwardRef` + `useMachine` + hook a `styled-system/recipes`), con `role`/`data-state`/`aria-busy` derivados de `a11y` y un `onKeyDown` generado desde `a11y.keyboard`.
- `panda.config.ts` pasó a importar `actionButtonTokens` (generado) como única fuente de `theme.extend.tokens` — el control manual y el componente generado leen ahora los mismos tokens compilados; ya no hay valores de color duplicados a mano en `panda.config.ts`.
- Verificado con un experimento real (no solo en teoría): se cambió `color.actionButton.idle.bg` en `tokens/tokens.json`, se regeneró solo `panda-preset.ts`, y el cambio se propagó a `packages/ui/src/actionButton/tokens.ts` sin tocar ningún otro fichero. Revertido después.
- `storybook build` y la suite de Vitest (29/29, incluye render, recorrido de los 5 estados, teclado, axe) pasan contra el componente generado.
- **Dos límites reales del modelo actual, encontrados al implementar (no antes):**
  1. El enum `VisualProperty` del esquema (Fase 1) solo cubre `backgroundColor`/`color`/`borderColor`. Layout (padding, gap, radius, tamaño de fuente, cursor, transición) no es representable en la spec — el compilador lo resuelve con una base fija, no derivada de la spec, igual para cualquier componente futuro. Es una decisión de diseño del compilador, no del canon.
  2. La spec no tiene forma de expresar "CLICK debe invocar un callback externo y su resultado (promesa) debe alimentar de vuelta RESOLVE/REJECT" — es lógica de negocio, explícitamente fuera de alcance por la regla 4 del plan. El componente generado expone un punto de extensión mecánico (`ref.send` + prop `onStateChange`) y ese cableado async vive fuera del árbol generado (en `test/generated/action-button-component.test.tsx`, marcado explícitamente como tal). El control manual, en cambio, tiene esa lógica cableada por dentro (prop `onAction` directa) — son dos superficies de API distintas para el mismo comportamiento observable.
  3. (Corolario del punto 2 y del hallazgo de la Fase 3) el componente generado con `disabled: true` en la construcción NO renderiza el atributo HTML `disabled` nativo — el guard bloquea la transición pero no toca el DOM. El control manual sí lo hace (vía su `initialState` condicional). Divergencia de UX real entre ambas superficies, documentada y con test propio en cada lado en vez de forzarlas a comportarse igual.

## Fase 5 — Destino 3: stories generadas

- `packages/compiler/src/graph.ts` (nuevo, compartido con `verify.ts`): `reachableStates` (BFS) y `shortestPathTo` (BFS con reconstrucción de camino, ignora transiciones `AFTER` porque disparan solas — una story no puede "hacer clic" en un temporizador).
- `emit/stories.ts` (150 líneas): una story por estado alcanzable — para cada una, calcula el camino más corto desde el inicial y clasifica cada transición del camino en `click` / `key` (si tiene entrada en `a11y.keyboard`) / `resolve` / `reject` / `unsupported`. Genera un `play` function real (`storybook/test`) que reproduce ese camino y espera (`waitFor`) al estado destino. Más una story `FullGraphWalk` que encadena éxito y error en una sola interacción continua.
- Se ejecuta `storybook build` en verde con ambos ficheros de stories (manual + generado) — 29/29 tests de Vitest siguen pasando, el generador no tocó ningún fichero de test existente.
- **Tres hallazgos reales al implementar (documentados, no ocultos):**
  1. El estado "pending" es tanto un destino de story como un PASO INTERMEDIO hacia "success"/"error" — si el wrapper resuelve la promesa demasiado rápido, la story nunca observa "pending" (mismo tipo de carrera que en la Fase 3). Solución: un modo `settleMode: "never"` específico para cuando el estado objetivo ES "pending".
  2. `DISABLE`/`ENABLE` no tienen entrada en `a11y.keyboard` ni son `CLICK` — no hay forma de disparar el estado "disabled" desde una interacción real. El generador cae a un heurístico mecánico: si existe un campo de contexto booleano con el MISMO NOMBRE que el estado destino (`disabled` campo ↔ estado `disabled`), genera la story con `args: { disabled: true }` en vez de un `play`. Es una coincidencia de nombres, no una regla declarada en la spec — funciona aquí, no generaliza sin más.
  3. Nombrar exports de story a partir del nombre del estado en PascalCase choca con globals de JS: el estado `error` produce `export const Error`, que sombrea el `Error` global del módulo — `new Error(...)` dentro del propio fichero generado deja de referirse al constructor nativo. Hubo que usar `new globalThis.Error(...)` en la plantilla del compilador. Es un recordatorio de que "convertir un string arbitrario en un identificador" nunca es tan inocente como parece.
- Efecto colateral positivo: al depurar el hallazgo 1 se detectó que `exactOptionalPropertyTypes: true` (tsconfig base) rechazaba el patrón normal de React `prop={valorPosiblementeUndefined}` en las stories generadas. Se retiró esa opción del tsconfig compartido — no aportaba seguridad real aquí, solo fricción con JSX idiomático.

## Fase 6 — Destino 4: tests generados

- `emit/tests.ts` (145 líneas) genera `test/generated/action-button.generated.test.tsx` (324 líneas, **36 tests**) a partir de la matriz completa estado×evento:
  - 7 tests de transición válida (uno por fila de la tabla, excluyendo la temporizada).
  - 1 test de la transición temporizada (`AFTER successDuration`).
  - 23 tests de transición inválida — el producto de 5 estados × 6 eventos menos las 7 combinaciones válidas: para cada (estado, evento) sin transición declarada, comprueba que el evento es un no-op. Incluye literalmente "CLICK en pending no hace nada", el ejemplo que cita el plan.
  - 5 tests de accesibilidad (`vitest-axe`), uno por estado, alcanzado reproduciendo el camino más corto (`shortestPathTo`) vía `ref.send` directo — no simula clic/teclado como las stories (aquí el objetivo es "¿el DOM de este estado es accesible?", no "¿un usuario real llega aquí?").
  - **36/36 en verde** a la primera ejecución tras el ajuste de orden ref/DOM.
- **Hallazgo importante, no menor**: al ejecutar `pnpm generate` completo por primera vez (los 5 emisores juntos), `rmSync(outDir, {recursive:true})` borró también `packages/ui/package.json` y `packages/ui/tsconfig.json` — ficheros escritos a mano en las Fases 3-4 que NUNCA se habían regenerado porque hasta ahora solo se habían probado los emisores por separado. Esto es exactamente el escenario que el plan anticipa con "si algo no se puede regenerar, no pertenece ahí" (sección 4): la solución no fue mover esos ficheros fuera de `packages/ui`, sino generarlos también — `emit/index.ts` ahora escribe `package.json`/`tsconfig.json` con una plantilla fija antes de invocar los demás emisores. Confirmado idempotente: correr `pnpm generate` dos veces seguidas no produce diff.
- `pnpm generate` end-to-end (los 5 destinos en una sola pasada) funciona por primera vez en esta fase. `pnpm run typecheck` (todo el workspace) y `storybook build` en verde tras la regeneración completa.

## Fase 7 — Verificador de completitud

- Las 6 reglas ya se habían escrito en la Fase 1 (`verify.ts`) para poder ejecutar `pnpm verify` desde el principio; esta fase las somete a prueba de verdad.
- `packages/compiler/src/verify.test.ts` (8 tests): construye una spec mínima válida (un `toggleSwitch` de 2 estados) y la rompe de 5 formas distintas, una por regla — falta de tratamiento visual, transición a un estado inexistente, estado inalcanzable, estado sin salida sin `final`, y mapeo de teclado a un evento no declarado (la sexta regla, foco por estado, se prueba aparte). Cada caso comprueba que el `rule` y el `path` del issue son los esperados, y un test final comprueba que los 5 mensajes de error son literalmente distintos entre sí (`Set` de tamaño 5).
- **8/8 en verde**: el verificador distingue las 5 (+1) roturas con mensajes accionables, cumpliendo el criterio de salida de la fase tal cual está escrito en el plan.

## Fase 8 — Guardarraíles anti-deriva

- `.githooks/pre-commit`: si el commit incluye cambios dentro de `packages/ui/`, la story generada o el test generado, ejecuta `pnpm generate` y compara el resultado contra lo que hay en el índice (`git diff` tras regenerar). Si difieren, rechaza el commit con un mensaje explicando qué hacer (editar la spec, no el fichero generado). Activación: `pnpm run hooks:install` (usa `git config core.hooksPath`, sin dependencias nuevas — nada de husky).
- **Probado de verdad, dos veces, no solo en teoría:**
  1. Se editó a mano `packages/ui/src/actionButton/machine.ts`, se hizo `git add` + `git commit` → **el commit fue rechazado** (exit 1), listando el fichero divergente y la instrucción de arreglo. Cambio revertido después.
  2. Se cambió `tokens/tokens.json` de verdad, se regeneró, se hizo `git add` + `git commit` → **el commit se aceptó** (exit 0) sin fricción. Revertido después (era solo la prueba del guardarraíl).
- `pnpm run check:no-manual-edits` (para CI): regenera y falla si `packages/ui/`, la story o el test generados difieren de lo committeado — ahora cubre los tres destinos generados, no solo `packages/ui/` como en el borrador inicial del script.
- `.gitattributes`: marca los tres destinos generados como `linguist-generated=true`.
- CODEOWNERS: no se añadió. El fichero viviría en la raíz real del repositorio (`/`, fuera de `mvp0-canon/`), que también contiene el proyecto `vuetify-testing-utils` no relacionado con este MVP, y requeriría un equipo/revisor real de GitHub que no existe en este contexto — habría sido un placeholder sin efecto verificable. El hook de pre-commit ya cumple el criterio de salida literal ("editar a mano un fichero generado y hacer commit falla"), probado empíricamente arriba; CODEOWNERS habría sido una capa adicional de gobierno de PR, no una necesidad para este MVP.
