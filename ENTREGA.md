# Entrega · Laboratorio API · Notas del semestre

**Equipo:** 11  
**Integrantes:** Luis Mateo Arrieta Jimenez  
**Repositorio:** https://github.com/Mateo-arrieta/equipo-11-api/tree/main

> Completa este archivo a medida que avanzas (cada sección dice en qué parte de la guía se llena).
> Escribe con tus palabras: las respuestas copiadas de la guía o de otro equipo no cuentan.

---

## 1. El contrato que diseñé (Parte 1 · ANTES de programar)

La app de Notas necesita estas seis operaciones. Para cada una decide **el método HTTP, la URI y los estados** que
devolverá (el éxito y los errores posibles). Reglas del juego: la URI nombra un **recurso** (sustantivo, plural,
minúsculas, con versión `/v1`) y el **método** es la acción. No pongas verbos en la URI.

| Operación | Método | URI | Éxito (estado + qué devuelve) | Errores posibles (estado → cuándo) |
|---|---|---|---|---|
| Listar todas las evaluaciones | GET | /v1/evaluaciones | 200 + arreglo JSON | Ninguno propio |
| Ver una evaluación | GET | /v1/evaluaciones/{id} | 200 + la evaluación | 404 si no existe |
| Crear una evaluación | POST | /v1/evaluaciones | 201 + la evaluación + cabecera Location | 422 valor inválido, 409 choca con el estado, 400 JSON roto, 415 no es JSON |
| Poner o quitar la nota de una evaluación | PATCH | /v1/evaluaciones/{id} | 200 + la evaluación actualizada | 404 no existe, 422 nota fuera de 0 a 5 |
| Eliminar una evaluación | DELETE | /v1/evaluaciones/{id} | 204 sin cuerpo | 404 si no existe |
| Ver el resumen (acumulado, nota necesaria, estado) | GET | /v1/resumen | 200 + el resumen | Ninguno propio |

### 1b. Critica estas direcciones

Alguien diseñó estas direcciones. Escribe qué está mal en cada una y cómo la reescribirías.

| Diseño original | Qué está mal | Cómo la reescribo |
|---|---|---|
| `POST /crearEvaluacion` | 	Lleva un verbo en la URI (el método ya dice «crear»), está en camelCase (deben ser minúsculas con guiones) y no tiene versión. | POST /v1/evaluaciones |
| `GET /getAllEvaluaciones?format=json` | El verbo get y la palabra all sobran (el método GET sobre una colección ya lista todo). Está en camelCase, no tiene versión y ?format=json es ruido: JSON es el formato de la API y el cliente puede indicar lo que acepta con la cabecera Accept. | GET /v1/evaluaciones |
| `GET /eliminar?id=3` | Verbo en la URI. Además usa GET para algo que cambia el estado, y GET debe ser seguro: un buscador, una precarga del navegador o un enlace podrían borrar datos sin querer. El id también va mal, porque identifica un recurso y debe colgar de la ruta, no de la consulta. | DELETE /v1/evaluaciones/3 → 204 |
| `POST /evaluacion/3/calificar` (responde `200 { "ok": false, "error": "..." }` si la nota es inválida) | Tiene un verbo en la URI, evaluacion está en singular y falta la versión. Usa POST para cambiar solo una parte de un recurso, que es trabajo de PATCH. Lo más grave es que responde 200 con ok: false: el éxito o fracaso lo dice el estado HTTP, nunca un campo del cuerpo, y el error debería usar el formato común application/problem+json. | PATCH /v1/evaluaciones/3 con { "nota": 4.5 } → 200 con la evaluación. Si la nota es inválida: 422 con un problema legible. |
| `GET /v1/Evaluaciones/` | Tiene una mayúscula y una barra final. Ambas rompen la regla de minúsculas, sin extensión y sin barra final. Dos direcciones distintas para el mismo recurso confunden a los clientes y a las cachés. | GET /v1/evaluaciones |
| `PUT /evaluaciones` con **toda** la lista de evaluaciones en el cuerpo, cada vez que algo cambia | PUT reemplaza el recurso completo, aquí la colección entera. Si dos aparatos la modifican a la vez, el último que envía pisa los cambios del otro sin enterarse. También se manda mucha información de más por un cambio pequeño, y el servidor pierde el control: ya no decide los id ni valida evaluación por evaluación. No tiene versión. | Operaciones sobre un solo elemento: POST /v1/evaluaciones para crear, PATCH /v1/evaluaciones/{id} para modificar y DELETE /v1/evaluaciones/{id} para borrar. |

## 2. Mis decisiones de estado (Parte 2)

Después de completar `ESTADO_POR_CODIGO`, responde con tus palabras.

| Situación | Estado que elegí | ¿Por qué ese y no otro? |
|---|---|---|
| El peso es 0, o la nota es 7 | 422 | El valor incumple una regla por sí solo, sin importar lo que haya guardado. La solicitud está bien formada pero no se puede procesar. |
| El nombre ya existe, o los pesos pasarían de 100 | 409 | El valor es válido en sí mismo, pero choca con lo que ya existe en el servidor. |
| La evaluación no existe | 404 | El recurso que identifica la URI no está. |
| El cuerpo no es JSON, o está roto | 400 | La solicitud ni siquiera se pudo leer, y esto lo detecta el núcleo antes de llegar a tus rutas. |
| El cuerpo es JSON pero se envió como `text/plain` | 415 | El contenido está bien, pero el servidor no acepta ese tipo de medio. |
| Se pide `PUT /v1/evaluaciones` (no existe ese método ahí) | 405 | La dirección existe, pero no admite ese método. |

1. ¿Por qué calificar usa `PATCH` y no `PUT`? calificar cambia una parte del recurso (solo la nota). PUT exige enviar el recurso completo. ¿Y por qué crear usa `POST` y no `PUT`? el servidor decide el id, así que el cliente no sabe a qué URI crear.
2. `DELETE` repetido: la primera vez responde 204 y la segunda 404. ¿Eso rompe la idempotencia? Explica qué significa en realidad «idempotente». idempotente no significa «misma respuesta», sino mismo efecto en el servidor. Pedir el borrado una o diez veces deja el sistema igual: la evaluación no existe. Que la segunda respuesta sea 404 no lo rompe.
3. ¿Por qué el `type` de un problema es un identificador estable y no basta con el `detail`? el detail es un texto para personas, que puede cambiar o traducirse. El type es un identificador para programas, y un cliente puede decidir qué hacer según él sin leer el mensaje.

## 3. MVC a los dos lados del cable (Parte 3)

Dibuja (a mano y pega una foto, o con texto/Mermaid) el recorrido completo desde que el usuario presiona **Agregar**
hasta que ve la fila nueva. Marca en cada paso **el archivo y el método** que actúa, y dónde cruza el cable.

```text
NAVEGADOR
 1. vista.js            el usuario pulsa Agregar → dispara alAgregar(datos)
 2. controlador.js      #agregar(datos) → #intentar(...)        (espera con await)
 3. modelo-remoto.js    agregar() → #ordenar()
 4. cliente-api.js      solicitar('POST', '/evaluaciones', {...})
                              │
 ════════════════════ CABLE: POST /v1/evaluaciones ══════════════════
                              │
SERVIDOR
 5. nucleo.mjs          lee el JSON y busca la ruta
 6. rutas.mjs           crear() → modelo.agregar(...)
 7. modelo.js           valida las reglas y guarda (almacen.mjs)
 8. rutas.mjs           responde 201 + Location + la evaluación
                              │
 ════════════════════ CABLE: respuesta 201 ═════════════════════════
                              │
NAVEGADOR
 9. modelo-remoto.js    #ordenar() → sincronizar(): GET lista + GET resumen
10. modelo-remoto.js    avisa a los suscriptores (Observer)
11. vista.js            render() dibuja la fila nueva
12. controlador.js      limpia el formulario (solo si el servidor aceptó)
```

13. ¿Qué archivos del navegador **no** tuviste que tocar al conectar la API? vista.js y main.js. ¿Qué te dice eso de la arquitectura? Eso muestra que el MVC cumplió su promesa: cambiaste el Modelo por dentro (de localStorage a HTTP) y la Vista ni se enteró.
14. ¿Dónde viven ahora las reglas de negocio? solo en el servidor (modelo.js) ¿Por qué el navegador no debe validar «por su cuenta» el peso, si ya lo sabe? Si el navegador también validara, tendrías la misma regla en dos sitios, y cuando una cambie se desincronizan. El navegador mostraría un error distinto al que el servidor realmente aplica.
15. Cuando el servidor se cae, ¿qué ve el usuario? el usuario ve el mensaje general de conexión y conserva lo que escribió. ¿Qué pieza del MVC lo decide? Lo decide el Controlador, según el tipo de error: ErrorDeServicio muestra el aviso general y ErrorDeReglas muestra el mensaje del servidor.

## 4. Versionado (Parte 4)

Clasifica cada cambio posible a la API como **compatible** (los clientes existentes siguen funcionando) o **rompe** a
los clientes existentes, y justifica en una frase.

| Cambio | ¿Compatible o rompe? | ¿Por qué? |
|---|---|---|
| Agregar el campo `aporte` a cada evaluación | Compatible | Un cliente que no lo conoce simplemente lo ignora. |
| Cambiar `peso` por `porcentaje` en cada evaluación | Rompe | Los clientes leen peso, y ese campo desaparece. |
| Devolver `nota` como texto (`"4.2"`) en vez de número | Rompe | Cambia el tipo: los clientes que hacen cuentas con la nota fallan. |
| Agregar el endpoint `GET /v1/evaluaciones/{id}/historial` | Compatible | Es una dirección nueva y las existentes no cambian. |
| Pasar la lista de un arreglo a un objeto `{ datos, paginacion }` | Rompe | Es justo lo que hizo que creáramos la v2: un cliente que recorre un arreglo falla con un objeto. |
| Exigir un campo nuevo, `profesor`, al crear una evaluación | Rompe | Los clientes existentes no lo envían y recibirían 422. |
| Cambiar el `porPagina` por defecto de 10 a 20 | Rompe, de forma sutil | La forma de la respuesta no cambia, pero un cliente que asume 10 por página se descuadra. Es un cambio de comportamiento, no solo de formato. |
| Aceptar también `peso` con decimales de coma (`"12,5"`) | Compatible | 	Acepta más entradas y no quita ninguna de las que ya funcionaban. |

**Plan de retiro de la v1.** Fechas que usaron en `Deprecation` y `Sunset`: Deprecation el 1 de octubre de 2026 y Sunset el 31 de diciembre de 2027.
¿Cómo se enteraría un cliente real que nunca lee tu documentación? Porque el aviso viaja en la respuesta misma. Cada vez que alguien pide GET /v1/evaluaciones recibe las cabeceras Deprecation, Sunset y Link con rel="successor-version" apuntando a /v2/evaluaciones. En el navegador, cliente-api.js detecta la cabecera y muestra una advertencia en la consola, una sola vez por recurso. Además, la operación está marcada como deprecated en /openapi.json. ¿Qué pondrías en tu plan para ayudarlos a migrar? Dejar la v1 y la v2 funcionando en paralelo durante todo el plazo (más de un año). Publicar una guía corta con lo que cambia: la lista pasa de ser un arreglo a un objeto { datos, paginacion }, y para recorrer las páginas se usa la cabecera Link. Antes de apagar la v1, revisar cuántas solicitudes siguen llegando a ella y avisar con tiempo a quienes la usan. Pasada la fecha del Sunset, la v1 podría responder 410 Gone con un mensaje que indique dónde está la v2.

## 5. Evidencias (Partes 2 a 5)

**Salida de `npm test`** (pega el final, donde dice cuántas pruebas pasan):

✗ 105 de 110 pruebas pasan.

**Captura de pantalla** de la pestaña *Network* del navegador mostrando las cabeceras `Deprecation` y `Sunset` de `GET /v1/evaluaciones`: _(pega la imagen o su enlace)_

**Fragmento de `/openapi.json`** con la operación `GET /v2/evaluaciones`:

```json
{
  "operationId": "listarEvaluaciones_v2",
  "tags": ["v2"],
  "summary": "Lista las evaluaciones paginadas, con filtro y orden",
  "parameters": [
    {
      "name": "pagina",
      "in": "query",
      "required": false,
      "description": "Número de página, empezando en 1.",
      "schema": { "type": "integer", "minimum": 1, "default": 1 }
    },
    {
      "name": "porPagina",
      "in": "query",
      "required": false,
      "description": "Cuántas evaluaciones trae cada página.",
      "schema": { "type": "integer", "minimum": 1, "maximum": 50, "default": 10 }
    },
    {
      "name": "estado",
      "in": "query",
      "required": false,
      "description": "Filtra por tener nota (calificada) o no (pendiente).",
      "schema": { "type": "string", "enum": ["pendiente", "calificada"] }
    },
    {
      "name": "orden",
      "in": "query",
      "required": false,
      "description": "Campo por el que se ordena; un guion delante invierte el orden.",
      "schema": { "type": "string", "enum": ["id", "nombre", "-nombre", "peso", "-peso"], "default": "id" }
    }
  ],
  "responses": {
    "200": {
      "description": "Una página de evaluaciones.",
      "headers": {
        "Link": {
          "description": "Dónde están la página anterior (rel=\"prev\") y la siguiente (rel=\"next\"), cuando existen (RFC 8288).",
          "schema": { "type": "string" }
        }
      },
      "content": {
        "application/json": {
          "schema": { "$ref": "#/components/schemas/PaginaDeEvaluaciones" }
        }
      }
    },
    "400": {
      "description": "Algún parámetro (pagina, porPagina, estado u orden) no es válido.",
      "content": {
        "application/problem+json": {
          "schema": { "$ref": "#/components/schemas/Problema" }
        }
      }
    }
  }
}
```

## 6. Reflexión

1. En la clase pasada el Modelo guardaba en `localStorage`. ¿Qué problemas concretos resolvió llevarlo a un servidor?  ¿Cuáles problemas **nuevos** aparecieron (piensa en tiempo, fallos, dos aparatos)? Resolvió que los datos ya no dependen de un solo navegador: con localStorage cada aparato tenía su propia copia. También dejó las reglas de negocio en un único dueño, el servidor, en vez de repartidas por cada cliente. Los problemas nuevos fueron varios. Todo tarda, así que el Modelo y el Controlador pasaron a ser asíncronos: mientras el Controlador no esperaba con await, el formulario se limpiaba antes de que el servidor respondiera. Pueden fallar el cable o el servidor, y por eso hubo que separar ErrorDeServicio (no es culpa del usuario) de ErrorDeReglas. La pantalla puede quedar desactualizada, y por eso el Modelo remoto llama a sincronizar() después de cada orden y se pone al día si recibe un 404. Y dos aparatos pueden pisarse los cambios, que es lo que busca resolver el reto del ETag (no lo hice).
2. ¿Qué parte de lo que hicieron hoy es **REST de verdad** y qué parte es solo «JSON sobre HTTP»? (Pista: recursos, representaciones, métodos con significado, estados, sin estado.)
Es REST en que los recursos tienen URI con sustantivos en plural, los métodos tienen significado (GET es seguro, POST crea, PATCH cambia una parte, DELETE borra), el estado HTTP dice cómo salió la operación, los errores usan un formato común (problem+json) y no hay estado entre solicitudes: cada una trae lo que necesita. Se queda en "JSON sobre HTTP" en que no hay hipermedia de verdad: el cliente se sabe las URI de memoria y las respuestas no le dicen qué puede hacer después. Solo Location y Link se acercan a eso. Tampoco implementé caché condicional con ETag.
3. Elijan un principio de diseño de endpoints que les costó respetar. ¿Cuál era la tentación y qué prueba o regla los detuvo?
Me costó decidir entre 422 y 409. La tentación era responder 422 (o un 400) para todo lo que viniera mal, porque "algo está inválido". Lo que me aclaró fue separar los casos: si el valor incumple una regla por sí solo (peso 0, nota 7) es 422, y si el valor es válido pero choca con lo que ya hay en el servidor (nombre repetido, pesos que pasan de 100) es 409. Las pruebas del grupo 2B revisan justo esa diferencia, y el comentario de rutas.mjs también me frenó: ahí advierte que las rutas traducen y no deciden, así que no puse ningún if de validación en ellas.
4. La documentación OpenAPI y el código pueden contradecirse. ¿Cómo las pruebas de la Parte 5 lo evitan? ¿Qué otra forma conocen de mantenerlas de acuerdo?
Las pruebas comparan las rutas reales con lo que dice el documento. Me pasó: cuando registré la v2 en rutas.mjs, el grupo 5B bajó de 3/7 a 2/7 porque la documentación todavía no mencionaba esas rutas, y no volvió a subir hasta que las documenté. Otras formas de mantenerlas de acuerdo serían generar el documento a partir del código, o tener pruebas de contrato que validen cada respuesta real contra su esquema y que corran siempre al subir cambios.

5. Si esta API la usaran 50 aplicaciones de otras personas, ¿qué cambiaría en su manera de evolucionarla?
Ya no podría asumir que todos actualizan al mismo tiempo. Dentro de una misma versión solo haría cambios compatibles: agregar campos o endpoints sí, pero no quitar ni renombrar campos, no cambiar tipos, no exigir campos nuevos y no tocar valores por defecto como porPagina. Los cambios que rompen irían en una versión nueva, con avisos Deprecation y Sunset y plazos largos. Mediría cuántas solicitudes llegan a cada versión antes de retirar una, y trataría la documentación como un contrato que tiene que ser verdad. También avisaría con anticipación a los equipos que la usan.
