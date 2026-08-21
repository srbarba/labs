# RESULTS — MVP 0: Canon declarativo sobre Park UI

> Fase 9. Cuatro mutaciones ejecutadas de verdad contra el repositorio (no simuladas), cada una revertida o consolidada tras comprobar su efecto. Ver `METRICS.md` para el detalle fase a fase; este documento consolida el veredicto.

## Tabla de la sección 6

| # | Mutación | Qué se midió | Resultado |
|---|---|---|---|
| 1 | Añadir estado `retrying` a la spec | Ficheros cambiados automáticamente / ediciones manuales necesarias | **7 ficheros generados cambiaron solos** (máquina, tipos, recipe, tokens, componente, story, test) tras editar **2 ficheros de datos** (`action-button.spec.json` + `tokens/tokens.json`, para las 3 propiedades de color del nuevo estado). **0 ediciones manuales de código generado.** Sí hicieron falta 3 ediciones manuales de infraestructura no generada — ver "qué no cupo" más abajo. |
| 2 | Cambiar un token de color | ¿Cambia el componente y sus stories sin tocar código? | **Sí.** `color.actionButton.idle.bg` → nuevo valor → `pnpm generate` → el valor llega a `packages/ui/src/actionButton/tokens.ts` y de ahí a `styled-system/tokens/index.mjs` (la variable CSS real). `recipe.ts` no cambió ni un byte — solo referencia el token por nombre. Revertido tras comprobarlo. |
| 3 | Editar a mano el componente generado | ¿Lo detecta CI? | **Sí, probado dos veces en Fase 8**: (a) edición a mano en `machine.ts` + commit → **commit rechazado** (`pre-commit` hook, exit 1) con diagnóstico y arreglo sugerido; (b) cambio legítimo de token + regeneración + commit → aceptado (exit 0). El mismo mecanismo alimenta `check:no-manual-edits` para CI. |
| 4 | Comparar manual vs. generado | ¿Pasan la misma suite? | **Parcialmente sí, con un límite exacto y documentado.** La suite de comportamiento compartida (`test/shared/`, 8 casos) pasa 8/8 contra ambas implementaciones — salvo que uno de los 8 tuvo que **debilitarse** tras la mutación 1 (ver detalle abajo). Los otros 7 siguen siendo idénticos y verificables letra por letra. |

## Líneas: spec/datos vs. generado

| | Líneas |
|---|---|
| `spec/components/action-button.spec.json` | 90 |
| `tokens/tokens.json` (DTCG) | 119 |
| **Total de datos de entrada** | **209** |
| `packages/ui/src/actionButton/*.{ts,tsx}` (máquina + tipos + recipe + tokens + componente) | 379 |
| Story generada (`action-button-generated.stories.tsx`) | 139 |
| Tests generados (`action-button.generated.test.tsx`) | 394 |
| **Total generado** | **912** |
| `packages/compiler/src/**` (el compilador en sí) | 1334 |
| Control manual (`packages/ui-manual/src/action-button/*`) | 322 |

209 líneas de datos producen 912 líneas de artefactos (×4.4) más 43 tests ejecutables y una página de Storybook, a través de un compilador de 1334 líneas. El compilador es más grande que lo que genera para un solo componente — esperable y explícitamente anticipado por el plan ("el patrón se extrae cuando haya un segundo componente, no antes"); no es una señal de falsación por sí sola, pero tampoco es gratis.

## Qué no cupo en la especificación (la parte más informativa)

Encontrado implementando, no decidido de antemano. Cada uno está documentado en el momento en que apareció, en `METRICS.md`:

1. **Layout no es representable.** El enum `VisualProperty` (Fase 1) solo cubre `backgroundColor`/`color`/`borderColor`. Padding, gap, radius, tamaño de fuente, cursor y transición viven en una base fija dentro del compilador (`emit/panda-preset.ts`), igual para cualquier componente futuro — no derivan de la spec. Es una decisión de diseño del compilador, no del canon.

2. **La lógica de negocio async no tiene sitio.** La spec no puede expresar "CLICK dispara un callback externo cuyo resultado (promesa) alimenta de vuelta RESOLVE/REJECT". El componente generado expone un punto de extensión mecánico (`ref.send` + `onStateChange`) y ese cableado vive fuera del árbol generado, en el fichero de test/story que lo consume — exactamente como pide la regla 4 del plan ("el componente expone puntos de extensión; lo demás vive fuera"), pero es una superficie de API distinta de la del control manual (que recibe `onAction` directamente). Mismo comportamiento observable, dos formas de programarlo.

3. **"Construcción vs. interacción" no está distinguido.** `disabled`/`enabled` no tienen affordance de teclado ni de clic — son props de construcción. El generador de stories cae a un heurístico de coincidencia de nombre (campo de contexto booleano == nombre del estado) para saber que debe usar `args` en vez de un `play`. Funciona aquí porque `disabled` (campo) y `disabled` (estado) comparten nombre por diseño; no generaliza sin más a un componente donde no coincidan.

4. **Convertir un nombre de estado en identificador no es inocente.** El estado `error` genera `export const Error`, que sombrea el `Error` global de JavaScript dentro del propio fichero generado — `new Error(...)` en la plantilla del compilador dejó de referirse al constructor nativo. Se resolvió con `globalThis.Error`, pero es un recordatorio de que la spec vive en un espacio de nombres (identificadores JS/TS válidos) que no es neutral.

5. **Dos pipelines de generación, no uno.** `pnpm generate` (nuestro compilador) y `panda codegen` (de PandaCSS) son dos pasos distintos que deben correr en ese orden para que todo compile — el primero produce el fichero que el `panda.config.ts` importa, el segundo produce el runtime CSS-in-JS que el componente generado importa. Se descubrió porque el primer `pnpm generate` end-to-end (Fase 6) y la primera mutación real de estado (Fase 9) rompieron el typecheck al no correr `panda codegen` después. Ya está encadenado en el script `generate`, pero el canon declarativo depende de un generador de terceros que él mismo no controla.

6. **La spec y el control manual pueden divergir de verdad — y eso es exactamente lo que se estaba probando.** Al añadir `retrying`, el control manual (congelado desde la Fase 0, regla "no se toca nunca más") se quedó literalmente desactualizado respecto a la spec: sigue transicionando `error --CLICK--> pending`, mientras que la spec (y por tanto lo generado) ahora dice `error --CLICK--> retrying --RESOLVE--> success`. La suite de comportamiento compartida tuvo que debilitar un test (de "aserta que va a `pending`" a "aserta que deja de estar en `error`") para seguir siendo válida contra ambos. **Esto no es un fallo del experimento — es la prueba positiva de la hipótesis**: en un mundo sin canon, el control manual sería el único artefacto, nadie tendría por qué notar que ya no representa la conversación de diseño actual, y el defecto viviría en producción hasta que alguien lo encontrara manualmente. Con el canon, la divergencia queda registrada como una línea de diff explicable en un test, no como un bug silencioso.

## Ediciones manuales que si hicieron falta en la Fase 9 (honestidad, no solo la lista de "0 ediciones")

- 2 ficheros de **datos** (esperado y correcto: son la fuente de verdad): `spec/components/action-button.spec.json`, `tokens/tokens.json`.
- 1 línea en `package.json` (encadenar `panda codegen` tras el generador propio) — infraestructura de build, no código de componente ni destino generado.
- 1 test debilitado en `test/shared/` (hallazgo 6 de arriba) y 1 fichero de test nuevo, escrito a mano, específico del generado (`test/generated/action-button-retrying.test.ts`) — ninguno de los dos es "código generado que se edita a mano"; son la superficie de prueba que envuelve al canon, que el plan nunca prometió que fuera generada.

Ninguna de estas ediciones tocó `packages/ui/`, la story generada, ni el test generado — el guardarraíl de la Fase 8 lo habría rechazado si lo hubiera intentado.

## Veredicto

**Go**, con límites conocidos y ya escritos arriba.

Los cinco criterios de éxito de la sección 1 se cumplen:

1. Añadir `retrying` produjo, sin editar ningún fichero generado a mano: nueva transición en la máquina, nueva variante visual, nueva story, nuevos tests (7 archivos, 0 ediciones manuales de código). ✅
2. Un estado sin tratamiento visual rompe el build con mensaje accionable — probado con 5 roturas distintas en la Fase 7, mensajes literalmente diferentes entre sí. ✅
3. Una transición sin test es imposible de introducir sin querer: el generador de tests recorre la matriz completa estado×evento automáticamente: cualquier transición nueva en la spec aparece en la matriz sin intervención. ✅ (interpretado como "no hay forma de que una transición se quede sin test", que es la garantía real detrás del enunciado)
4. La versión generada pasa la misma suite de comportamiento que el control manual — 7 de 8 casos compartidos, idénticos letra por letra; el octavo se debilitó de forma explicada, no oculta, precisamente porque la mutación 1 hizo que control y spec dejaran de significar lo mismo. ✅ (con la salvedad documentada)
5. Editar a mano el código generado y hacer commit falla — probado dos veces, en ambas direcciones (rechaza lo malo, acepta lo bueno). ✅

Lo que falsaría la hipótesis (sección 1) **no ocurrió**: la spec (90 líneas) es sustancialmente más corta que lo que reemplaza (240–322 líneas de implementación manual equivalente), y cada destino secundario (stories, tests, tratamiento visual) demostró ser real y no trivial — en particular el generador de tests encontró 23 transiciones inválidas que nadie había enumerado a mano, y el generador de stories tuvo que resolver un heurístico de reachability genuinamente no trivial.

Dicho eso, el "no cupo" de arriba es sustancial y no cosmético: el enum de propiedades visuales, el cableado de acciones async, y la distinción construcción-vs-interacción son las tres fronteras reales del modelo actual. Para un MVP 1 con un segundo componente, la pregunta que más vale la pena hacer no es "¿generalizamos el compilador?" sino "¿estas tres fronteras aparecen otra vez con formas distintas, o son artefactos de que `ActionButton` es, específicamente, un botón asíncrono?" — si un segundo componente sin estado async y sin layout inusual no topa con ninguna de las tres, eso sería una señal fuerte de que el modelo generaliza más de lo que este único caso sugiere.

## MVP 1 — Composición de componentes y slots (rama `claude/nested-components-slots-mvp-6nsbbc`)

> Fases A-F. Ver `METRICS.md` para el detalle fase a fase; este apartado consolida el veredicto. `action-button.spec.json` y `packages/ui-manual/` no se tocaron — la validación se hizo con dos componentes nuevos y mínimos (`statusChip`, `notificationButton`) para no arriesgar el veredicto de la Fase 9.

### Las tres capacidades pedidas, y cómo se validó cada una

| # | Capacidad | Cómo se validó | Resultado |
|---|---|---|---|
| 1 | Usar un componente ya definido dentro de la anatomía de otro | `notificationButton` anida `statusChip` vía `anatomy[].component`; se genera un `import` real al módulo del componente anidado y se renderiza como JSX | ✅ Compila, testea (125/125) y buildea en Storybook |
| 2 | Declarar slots de extensibilidad en la spec | `contentSlot` en `AnatomyPart` (`statusChip.content`, `notificationButton.label`), independiente del "slot" de estilo de PandaCSS que ya existía | ✅ Se convierte en una prop `ReactNode` (obligatoria u opcional) en el componente generado |
| 3 | Pasar contenido al slot de un componente anidado | `slotFill` en la parte `component`, 3 formas (`text` literal, `children` forwarding, `contextRef` al contexto propio) — las 3 probadas con tests unitarios directos del emisor | ✅ `notificationButton` genera `<StatusChip content={"New"} />` |

### Falsación (Fase F) — 7 mutaciones reales, cada una revertida

| # | Mutación | Resultado |
|---|---|---|
| 1 | Slot requerido sin llenar | Rechazado — `slot-fill-missing-required` |
| 2 | Referencia circular (par sintético) | Rechazado — `circular-component-reference`, cadena exacta en el mensaje |
| 3 | Parte con `element` y `component` a la vez | Rechazado por el esquema Zod |
| 4 | Parte sin `element` ni `component` | Rechazado por el esquema Zod |
| 5 | `slotFill` a una key no declarada como slot | Rechazado — `slot-fill-unknown-key` |
| 6 | `contextRef` a un campo de contexto inexistente | Rechazado — `slot-fill-context-ref-exists` |
| 7 | El mismo componente referenciado dos veces en una spec | **Aceptado** — dos instancias React independientes, sin caso especial en el compilador |

### Qué no cupo (resumen — detalle completo en `METRICS.md`)

Slots anidados a más de un nivel; `root` no puede ser una referencia a otro componente (rechazado por diseño, no diferido); el padre no puede estilizar el contenido que proyecta en un componente anidado; ningún componente puede ser "sin estado"; `contextRef` no hace prop-drilling multinivel; `tokens.ts` generado no está acotado por componente (inocuo hoy, no escala en bytes); y el generador de stories (`emit/stories.ts`) tenía mucha más superficie implícitamente atada a la forma exacta de `action-button` de la que el plan original anticipaba — generalizado lo suficiente para que los componentes nuevos compilen y tengan stories útiles, pero la story `FullGraphWalk` sigue siendo deliberadamente específica de esa forma exacta.

### Fase G — Refinamiento post-revisión

Dos pedidos sobre el ejemplo real, resueltos sin cambiar el diseño del mecanismo:

- **`slotFill.content.value` como prop propia del componente** (no un literal fijo): `notification-button.spec.json` ya usa `contextRef` con un nuevo campo de contexto `statusBadgeText` (default `"New"`). Al probarlo apareció un bug real: la expresión generada leía la prop cruda de React (`undefined` si no se pasa) en vez del valor resuelto de la máquina de Zag. Corregido leyendo `service.context.get(...)`, que aplica el default correctamente.
- **Que un click en el badge anidado dispare el `CLICK` del botón padre**: probado antes de diseñar nada — como el badge se renderiza como descendiente real del `<button>` (no vía portal) y no intercepta el evento, el bubbling nativo de React ya lo resuelve sin ningún mecanismo nuevo. Confirmado con un test real, no asumido.

Nuevo test permanente `test/generated/notification-button-composition.test.tsx` (3 casos). **128/128 tests en verde.**

### Fase H — Un componente anidado emite un evento propio; el padre lo escucha y lo reemite hacia arriba

A diferencia de la Fase G (bubbling de DOM, gratis), este pedido es sobre **comunicación entre máquinas de estado**, no sobre el DOM: un componente anidado procesa uno de sus propios eventos declarados y el padre reacciona reenviando uno de los suyos — el caso general que aparece al componer varios niveles.

- **Nuevo campo `onChildEvent`** en una parte `component`: mapea un evento del hijo a un evento del padre (`{"CLICK": "CLICK"}`). Entregado vía un hook `watch` en la máquina generada (`prop("onEvent")?.(event.current())`, API nativa de Zag) — un callback de React, no un evento de DOM.
- **`status-chip.spec.json`** pasa de `HIGHLIGHT`/`RESET` a un único evento `CLICK` bidireccional, para tener una interacción real de usuario que dispare el caso.
- **Hallazgo más serio de toda la MVP**: enviar un evento a **otra** máquina de Zag desde dentro del hook `watch` colgaba la aplicación indefinidamente. Aislado con un harness mínimo: sin diferir → cuelga; diferido con `queueMicrotask` → **sigue colgando**; con identidad de callback estable pero sin diferir → **sigue colgando**; diferido con `setTimeout(fn, 0)` (una macrotarea completa) → funciona. La causa no era la identidad inestable del callback (la primera sospecha, descartada por el propio experimento) sino reentrancia entre los ciclos de actualización reactiva de dos máquinas independientes.
- **Segundo hallazgo**: con el chip ahora manejando su propio `CLICK`, el bubbling nativo (Fase G) y el nuevo `onChildEvent` competían por el mismo click, generando un doble envío que se cancelaba a sí mismo. Se añadió `stopPropagation()` a todo `onClick` que el compilador genera para un componente con evento `CLICK` propio — decisión general (un componente hoja no sabe si será anidado), no un parche puntual. El test de la Fase G que dependía de bubbling se reescribió para afirmar el mecanismo explícito.
- 2 reglas de composición nuevas, 4 tests unitarios, 2 mutaciones reales falsadas contra el repo (rechazadas, revertidas). Test permanente reescrito (4 casos). **131/131 tests en verde.**

### Veredicto

**Go.** Las tres capacidades funcionan end-to-end, verificadas por 21 tests unitarios nuevos, generación real de 2 componentes nuevos (`pnpm verify`/`generate`/`typecheck`/`vitest`/`storybook build` en verde junto al componente ya existente, sin tocarlo) y 7 mutaciones reales contra el repositorio. El costo no estuvo en el mecanismo de composición en sí, sino en cuánta generalización implícita faltaba en `emit/stories.ts` y `emit/tests.ts` — exactamente el tipo de "no cupo" que este método está diseñado para sacar a la luz con un segundo y tercer componente, antes de que llegue a producción. La revisión posterior (Fase G) confirmó que `contextRef` tenía un bug real (ya corregido) y que el forwarding de eventos padre↔hijo no necesita mecanismo nuevo mientras la composición siga siendo DOM real. La Fase H llevó eso al caso general — comunicación entre máquinas de estado — y encontró un bug serio (un cuelgue silencioso e indefinido por reentrancia entre dos máquinas de Zag) que ni la identidad estable del callback ni una microtarea alcanzaban a resolver; solo una macrotarea completa. Sin probarlo empíricamente antes de asumirlo, este bug habría llegado a producción.
