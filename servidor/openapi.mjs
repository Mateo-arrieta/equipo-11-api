/**
 * OPENAPI · la documentación de la API, escrita como DATOS                           (PARTE 5 de la guía)
 *
 * OpenAPI (https://spec.openapis.org) es un formato estándar para describir una API: qué rutas tiene,
 * qué recibe y qué devuelve cada una. Una herramienta (Swagger UI, Redoc, un generador de clientes…) lo
 * lee y produce documentación navegable, clientes o pruebas.
 *
 * Aquí el documento es un objeto de JavaScript que el servidor publica en GET /openapi.json.
 * Las pruebas de la Parte 5 comparan este documento con las rutas REALES: si la documentación y el
 * código se contradicen, falla una prueba. (La documentación que miente es peor que no tener ninguna.)
 *
 * Ya viene documentado lo que no cambió entre versiones (crear, obtener, calificar, eliminar y el resumen),
 * los esquemas (components.schemas) y la lista de la v1. Tu trabajo: reemplazar cada "TODO 5…" hasta que
 * `npm run test:docs` quede en verde. Lee primero cómo está escrito lo que ya existe: es tu modelo.
 */

import { paraVersiones } from './nucleo.mjs';

const problema = (descripcion) => ({
  description: descripcion,
  content: { 'application/problem+json': { schema: { $ref: '#/components/schemas/Problema' } } },
});

const json = (esquema) => ({ 'application/json': { schema: { $ref: `#/components/schemas/${esquema}` } } });

const parametroId = {
  name: 'id',
  in: 'path',
  required: true,
  description: 'Identificador de la evaluación.',
  schema: { type: 'integer', minimum: 1 },
};

// ------------------------------------------------------------------------------ Lo que no cambia entre versiones
// Cada entrada se expone en cada versión (igual que en rutas.mjs). El prefijo "/v1", "/v2"… lo pone paraVersiones.
const comunes = (version) => [
  {
    ruta: '/evaluaciones',
    metodo: 'post',
    operacion: {
      operationId: `crearEvaluacion_${version}`,
      tags: [version],
      summary: 'Crea una evaluación',
      requestBody: { required: true, content: json('NuevaEvaluacion') },
      responses: {
        201: {
          description: 'Evaluación creada.',
          headers: { Location: { description: 'URI de la evaluación creada.', schema: { type: 'string' } } },
          content: json('Evaluacion'),
        },
        400: problema('El cuerpo no es JSON válido, está vacío o no es un objeto.'),
        409: problema('Choca con el estado actual: los pesos pasarían de 100 % o el nombre ya existe.'),
        415: problema('El cuerpo no se envió como application/json.'),
        422: problema('Un valor incumple una regla: nombre, peso o nota.'),
      },
    },
  },
  {
    ruta: '/evaluaciones/{id}',
    metodo: 'get',
    operacion: {
      operationId: `obtenerEvaluacion_${version}`,
      tags: [version],
      summary: 'Obtiene una evaluación',
      parameters: [parametroId],
      responses: { 200: { description: 'La evaluación.', content: json('Evaluacion') }, 404: problema('No existe la evaluación.') },
    },
  },
  {
    ruta: '/evaluaciones/{id}',
    metodo: 'patch',
    operacion: {
      operationId: `calificarEvaluacion_${version}`,
      tags: [version],
      summary: 'Pone, cambia o quita la nota de una evaluación',
      parameters: [parametroId],
      requestBody: { required: true, content: json('Calificacion') },
      responses: {
        200: { description: 'La evaluación con su nota nueva.', content: json('Evaluacion') },
        400: problema('El cuerpo no es JSON válido, está vacío o no es un objeto.'),
        404: problema('No existe la evaluación.'),
        415: problema('El cuerpo no se envió como application/json.'),
        422: problema('La nota debe ser un número entre 0 y 5, o null.'),
      },
    },
  },
  {
    ruta: '/evaluaciones/{id}',
    metodo: 'delete',
    operacion: {
      operationId: `eliminarEvaluacion_${version}`,
      tags: [version],
      summary: 'Elimina una evaluación',
      parameters: [parametroId],
      responses: { 204: { description: 'Eliminada. No hay cuerpo.' }, 404: problema('No existe la evaluación.') },
    },
  },
  {
    ruta: '/resumen',
    metodo: 'get',
    operacion: {
      operationId: `obtenerResumen_${version}`,
      tags: [version],
      summary: 'Calcula el resumen: acumulado, nota necesaria y estado',
      responses: { 200: { description: 'El resumen actual.', content: json('Resumen') } },
    },
  },
];

// ------------------------------------------------------------------------------ Lo que SÍ cambió: la lista
const listarV1 = {
  operationId: 'listarEvaluaciones_v1',
  tags: ['v1'],
  summary: 'Lista todas las evaluaciones',
  deprecated: true,
  responses: {
    200: {
      description: 'Un arreglo con todas las evaluaciones.',
      headers: {
        Deprecation: {
          description: 'Desde cuándo está obsoleta esta versión (RFC 9745).',
          schema: { type: 'string' },
        },
        Sunset: {
          description: 'Fecha en que se retira esta versión (RFC 8594).',
          schema: { type: 'string' },
        },
        Link: {
          description: 'Apunta a la versión sucesora, con rel="successor-version" (RFC 8288).',
          schema: { type: 'string' },
        },
      },
      content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Evaluacion' } } } },
    },
  },
};

const listarV2 = {
  operationId: 'listarEvaluaciones_v2',
  tags: ['v2'],
  summary: 'Lista las evaluaciones paginadas, con filtro y orden',
  parameters: [
    {
      name: 'pagina',
      in: 'query',
      required: false,
      description: 'Número de página, empezando en 1.',
      schema: { type: 'integer', minimum: 1, default: 1 },
    },
    {
      name: 'porPagina',
      in: 'query',
      required: false,
      description: 'Cuántas evaluaciones trae cada página.',
      schema: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
    },
    {
      name: 'estado',
      in: 'query',
      required: false,
      description: 'Filtra por tener nota (calificada) o no (pendiente).',
      schema: { type: 'string', enum: ['pendiente', 'calificada'] },
    },
    {
      name: 'orden',
      in: 'query',
      required: false,
      description: 'Campo por el que se ordena; un guion delante invierte el orden.',
      schema: { type: 'string', enum: ['id', 'nombre', '-nombre', 'peso', '-peso'], default: 'id' },
    },
  ],
  responses: {
    200: {
      description: 'Una página de evaluaciones.',
      headers: {
        Link: {
          description: 'Dónde están la página anterior (rel="prev") y la siguiente (rel="next"), cuando existen (RFC 8288).',
          schema: { type: 'string' },
        },
      },
      content: json('PaginaDeEvaluaciones'),
    },
    400: problema('Algún parámetro (pagina, porPagina, estado u orden) no es válido.'),
  },
};

// ------------------------------------------------------------------------------ Los esquemas
const nombre = { type: 'string', minLength: 1, maxLength: 40, description: 'Único (sin importar mayúsculas).' };
const peso = { type: 'number', minimum: 1, maximum: 100, description: 'Porcentaje de la nota final. Todos juntos no pasan de 100.' };
const nota = { type: ['number', 'null'], minimum: 0, maximum: 5, description: 'null mientras no esté calificada.' };

const esquemas = {
  Evaluacion: {
    type: 'object',
    required: ['id', 'nombre', 'peso', 'nota'],
    properties: { id: { type: 'integer', minimum: 1 }, nombre, peso, nota },
  },
  NuevaEvaluacion: { type: 'object', required: ['nombre', 'peso'], properties: { nombre, peso, nota } },
  Calificacion: { type: 'object', required: ['nota'], properties: { nota } },
  Resumen: {
    type: 'object',
    required: ['acumulado', 'pesoCalificado', 'pesoPendiente', 'notaNecesaria', 'estado', 'notaMinima', 'notaMaxima'],
    properties: {
      acumulado: { type: 'number' },
      pesoCalificado: { type: 'number' },
      pesoPendiente: { type: 'number' },
      notaNecesaria: { type: ['number', 'null'], description: 'Lo que necesitas en lo que falta; null si ya no falta nada.' },
      estado: { type: 'string', enum: ['aprobado', 'en-camino', 'en-riesgo', 'imposible'] },
      notaMinima: { type: 'number' },
      notaMaxima: { type: 'number' },
    },
  },
  Paginacion: {
    type: 'object',
    required: ['pagina', 'porPagina', 'total', 'totalPaginas'],
    properties: {
      pagina: { type: 'integer' },
      porPagina: { type: 'integer' },
      total: { type: 'integer', description: 'Cuántas evaluaciones hay en total con el filtro aplicado.' },
      totalPaginas: { type: 'integer' },
    },
  },
  PaginaDeEvaluaciones: {
    type: 'object',
    required: ['datos', 'paginacion'],
    properties: { datos: { type: 'array', items: { $ref: '#/components/schemas/Evaluacion' } }, paginacion: { $ref: '#/components/schemas/Paginacion' } },
  },
  Problema: {
    type: 'object',
    description: 'Detalles de un problema (RFC 9457), con el tipo de contenido application/problem+json.',
    required: ['type', 'title', 'status'],
    properties: {
      type: { type: 'string', format: 'uri-reference', default: 'about:blank', description: 'Identifica el tipo de problema.' },
      title: { type: 'string', description: 'Resumen corto, igual para todos los problemas del mismo tipo.' },
      status: { type: 'integer', description: 'El estado HTTP.' },
      detail: { type: 'string', description: 'Explicación de ESTE caso, pensada para una persona.' },
      instance: { type: 'string', description: 'La dirección que originó el problema.' },
    },
  },
};

// ------------------------------------------------------------------------------ El documento completo
const VERSIONES = ['v1', 'v2'];

export function documento() {
  const paths = {};
  const agregar = (ruta, metodo, operacion) => {
    paths[ruta] ??= {};
    paths[ruta][metodo] = operacion;
  };

  for (const version of VERSIONES) {
    const definiciones = paraVersiones([version], comunes(version));
    for (const { ruta, metodo, operacion } of definiciones) agregar(ruta, metodo, operacion);
  }
  agregar('/v1/evaluaciones', 'get', listarV1);
  agregar('/v2/evaluaciones', 'get', listarV2);

  return {
    openapi: '3.1.0',
    info: {
      title: 'API de Notas del semestre',
      version: '2.0.0',
      description: 'Calcula cuánto necesitas en lo que falta para aprobar.',
    },
    servers: [{ url: '/', description: 'El mismo servidor que sirve la página' }],
    tags: [
      { name: 'v1', description: 'Primera versión.' },
      { name: 'v2', description: 'Segunda versión: la lista ahora es una página.' },
    ],
    paths,
    components: { schemas: esquemas },
  };
}
