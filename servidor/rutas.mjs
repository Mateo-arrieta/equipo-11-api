/**
 * RUTAS · los endpoints de la API                                         (PARTES 2 y 4 de la guía)
 *
 * Aquí está el DISEÑO de la API: qué recursos hay, qué método y qué URI usa cada operación y qué estado HTTP
 * devuelve cada resultado. En términos de MVC, estos manejadores son el CONTROLADOR del servidor:
 *   · traducen una solicitud HTTP en una orden para el Modelo;
 *   · traducen el resultado (o el error) del Modelo en una respuesta HTTP.
 * No contienen reglas de negocio: esas son del Modelo (servidor/modelo.js). Si te descubres escribiendo
 * "if (peso > 100)" aquí, detente: la pregunta ya la sabe contestar el Modelo.
 *
 * Tu trabajo: reemplazar cada "TODO" hasta que `npm run test:api` (Parte 2) y `npm run test:versionado`
 * (Parte 4) queden en verde. Lee antes servidor/nucleo.mjs (arriba del todo explica qué recibe y qué
 * devuelve un manejador) y tu diseño de la Parte 1 (ENTREGA.md, sección 1).
 *
 * Orden de trabajo sugerido:  2A leer → 2B crear (y la tabla de estados) → 2C modificar y borrar → 4A, 4B y 4C.
 */

import { ErrorDeReglas } from './modelo.js';
import { ErrorHttp, leerEntero, paraVersiones } from './nucleo.mjs';
import { representarEvaluacion, representarResumen, tipoDeProblema } from './representaciones.mjs';

// ---------------------------------------------------------------- 2B · De regla del Modelo a estado HTTP
const ESTADO_POR_CODIGO = {
  NO_EXISTE: 404,
  NOMBRE_OBLIGATORIO: 422,
  NOMBRE_LARGO: 422,
  PESO_FUERA_DE_RANGO: 422,
  NOTA_FUERA_DE_RANGO: 422,
  NOMBRE_DUPLICADO: 409,
  PESOS_EXCEDEN_100: 409,
};

/** El núcleo la llama con cada error que no es un ErrorHttp. Lo que no es del Modelo se devuelve igual (→ 500). */
export function traducirError(error) {
  if (!(error instanceof ErrorDeReglas)) return error;
  const estado = ESTADO_POR_CODIGO[error.codigo] ?? 422;
  return new ErrorHttp(estado, error.message, tipoDeProblema(error.codigo));
}

// ---------------------------------------------------------------- Fechas del ciclo de vida de la v1 (Parte 4B)
const DEPRECIADA_DESDE = new Date('2026-10-01T00:00:00Z'); // RFC 9745: cabecera Deprecation
const SE_RETIRA_EN = new Date('2027-12-31T23:59:59Z'); // RFC 8594: cabecera Sunset

// Valores permitidos de ?orden= y ?estado= en la v2 (Parte 4A)
const ORDENES = ['id', 'nombre', '-nombre', 'peso', '-peso'];
const ESTADOS = ['pendiente', 'calificada'];

/** Ordena una lista de evaluaciones por 'id', 'nombre' o 'peso'; un guion delante invierte el orden. (Ya escrito.) */
function ordenar(lista, orden) {
  const campo = orden.replace('-', '');
  const sentido = orden.startsWith('-') ? -1 : 1;
  return [...lista].sort((a, b) => sentido * (typeof a[campo] === 'string' ? a[campo].localeCompare(b[campo], 'es') : a[campo] - b[campo]));
}

export function crearRutas(modelo) {
  /** Ya escrito: el id de la URI. Solo dígitos y sin ceros a la izquierda; cualquier otra cosa no identifica a nadie (→ NaN → 404). */
  const idDe = (solicitud) => (/^[1-9]\d*$/.test(solicitud.params.id) ? Number(solicitud.params.id) : NaN);

  // -------------------------------------------------------------- 2A · Leer
  const listarV1 = () => ({
    status: 200,
    cuerpo: modelo.evaluaciones.map((e) => representarEvaluacion(e)),
  });

  const obtener = (solicitud) => ({
    status: 200,
    cuerpo: representarEvaluacion(modelo.obtener(idDe(solicitud))),
  });

  // EJEMPLO RESUELTO (así se ve un manejador completo): el resumen es un recurso CALCULADO, de solo lectura.
  const resumen = () => ({ status: 200, cuerpo: representarResumen(modelo.resumen()) });

  // -------------------------------------------------------------- 2B · Crear   y   2C · Modificar y borrar
  const crear = ({ cuerpo, base }) => {
    const { nombre, peso, nota } = cuerpo;
    const nueva = modelo.agregar({ nombre, peso, nota });
    return {
      status: 201,
      cabeceras: { Location: `${base}/evaluaciones/${nueva.id}` },
      cuerpo: representarEvaluacion(nueva),
    };
  };

  const calificar = (solicitud) => ({
    status: 200,
    cuerpo: representarEvaluacion(modelo.calificar(idDe(solicitud), solicitud.cuerpo.nota)),
  });

  const eliminar = (solicitud) => {
    modelo.eliminar(idDe(solicitud));
    return { status: 204 };
  };

  // -------------------------------------------------------------- 4A · v2: lista paginada, filtrada y ordenada
  const listarV2 = ({ query, ruta }) => {
    // TODO 4A: pasos sugeridos.
    //   1. pagina = leerEntero(query, 'pagina', { porDefecto: 1, min: 1 })
    //      porPagina = leerEntero(query, 'porPagina', { porDefecto: 10, min: 1, max: 50 })   (lanzan 400 si no son válidos)
    //   2. estado = query.get('estado'): si no es null y no está en ESTADOS → throw new ErrorHttp(400, '...')
    //      orden = query.get('orden') ?? 'id': si no está en ORDENES → 400. Los mensajes deben nombrar el parámetro entre comillas.
    //   3. lista = modelo.evaluaciones; filtra por estado (pendiente = sin nota, calificada = con nota); ordena con ordenar().
    //   4. total, totalPaginas = Math.max(1, Math.ceil(total / porPagina)); recorta con slice y representa cada una.
    //   5. Cabecera Link (RFC 8288) con rel="prev" y rel="next" cuando existan esas páginas, conservando estado, orden y porPagina:
    //        </v2/evaluaciones?pagina=3&porPagina=3>; rel="next"        (ayuda: new URLSearchParams({...}))
    //   6. Responde 200 con { datos: [...], paginacion: { pagina, porPagina, total, totalPaginas } }.
    throw new Error('TODO 4A · listarV2()');
  };

  // -------------------------------------------------------------- La tabla de rutas
  // Cada entrada es { metodo, ruta, manejador }. La ruta usa plantillas: '/v1/evaluaciones/{id}'.
  // Mira primero tu diseño de la Parte 1: una URI nombra un recurso (sustantivo), el método HTTP es la acción.
  return [
    { metodo: 'GET', ruta: '/v1/evaluaciones', manejador: listarV1 },
    { metodo: 'GET', ruta: '/v1/evaluaciones/{id}', manejador: obtener },
    { metodo: 'GET', ruta: '/v1/resumen', manejador: resumen },
    { metodo: 'POST', ruta: '/v1/evaluaciones', manejador: crear },
    { metodo: 'PATCH', ruta: '/v1/evaluaciones/{id}', manejador: calificar },
    { metodo: 'DELETE', ruta: '/v1/evaluaciones/{id}', manejador: eliminar },
    //
    // TODO 4C: cuando termines la v2 (4A) y los avisos (4B), agrupa lo que no cambió con
    //          ...paraVersiones(['v1', 'v2'], [ ...las entradas sin el prefijo /v1... ]) y registra aparte la lista de cada versión:
    //          GET /v1/evaluaciones → listarV1 y GET /v2/evaluaciones → listarV2.
  ];
}
