/**
 * MODELO REMOTO · Notas del semestre                                       (PARTE 3A de la guía)
 *
 * SABE: pedirle el estado a la API, ordenarle cambios y avisar a sus suscriptores cuando algo cambió.
 *       Es el Modelo "visto desde el navegador": tiene la misma cara que el de la clase pasada
 *       (evaluaciones, resumen(), agregar, calificar, eliminar, suscribir), pero ya no decide nada.
 * NO SABE: ninguna regla de negocio (cuánto puede pesar una evaluación, cuándo se aprueba…). Esas viven
 *          en el servidor, que es su único dueño. Si el servidor dice que no, aquí se avisa; no se discute.
 *
 * Idea clave: la Vista y el Controlador siguen hablando con "un Modelo". Que ahora ese Modelo hable
 * HTTP por dentro es un detalle que solo este archivo (y cliente-api.js) conoce.
 *
 * Tu trabajo: reemplazar cada "TODO" hasta que `npm run test:cliente` (grupo 3A) quede en verde.
 */

import { ErrorApi, ErrorDeRed } from './cliente-api.js';

/** El servidor rechazó la orden por una regla del negocio. Su mensaje se puede mostrar tal cual. */
export class ErrorDeReglas extends Error {
  constructor(mensaje) {
    super(mensaje);
    this.name = 'ErrorDeReglas';
  }
}

/** Algo falló en el cable o en el servidor (no es culpa del usuario): sin red, 500… */
export class ErrorDeServicio extends Error {
  constructor(mensaje, causa) {
    super(mensaje);
    this.name = 'ErrorDeServicio';
    this.cause = causa;
  }
}

/** De un fallo de HTTP a un error que el Controlador entienda. */
function traducir(error) {
  if (error instanceof ErrorApi) {
    if ([404, 409, 422].includes(error.status)) {
      return new ErrorDeReglas(error.problema?.detail ?? error.message);
    }
    return new ErrorDeServicio('El servidor no pudo completar la operación.', error);
  }
  if (error instanceof ErrorDeRed) {
    return new ErrorDeServicio('No hay conexión con el servidor.', error);
  }
  return error;
}

export class NotasModeloRemoto {
  #api;
  #evaluaciones = [];
  #resumen = null;
  #suscriptores = new Set();

  constructor(api) {
    this.#api = api;
  }

  // EJEMPLO RESUELTO: pide al servidor el estado actual (la lista y el resumen), lo guarda y avisa a los suscriptores.
  // Fíjate en que el servidor es "la verdad": después de cada orden, el Modelo vuelve a preguntar.
  async sincronizar() {
    let evaluaciones;
    let resumen;
    try {
      [evaluaciones, resumen] = await Promise.all([this.#api.listarEvaluaciones(), this.#api.obtenerResumen()]);
    } catch (error) {
      throw traducir(error);
    }
    this.#evaluaciones = evaluaciones;
    this.#resumen = resumen;
    for (const suscriptor of this.#suscriptores) suscriptor();
  }

  /** Ya escrito. Copias, como en el Modelo de la clase pasada. */
  get evaluaciones() {
    return this.#evaluaciones.map((e) => ({ ...e }));
  }

  resumen() {
    return { ...this.#resumen };
  }

  suscribir(suscriptor) {
    this.#suscriptores.add(suscriptor);
    return () => this.#suscriptores.delete(suscriptor);
  }

  // 3A · Las órdenes viajan por la API
  async agregar({ nombre, peso, nota = null }) {
    await this.#ordenar(() => this.#api.solicitar('POST', '/evaluaciones', { nombre, peso, nota }));
  }

  async calificar(id, nota) {
    await this.#ordenar(() => this.#api.solicitar('PATCH', `/evaluaciones/${id}`, { nota }));
  }

  async eliminar(id) {
    await this.#ordenar(() => this.#api.solicitar('DELETE', `/evaluaciones/${id}`));
  }

    async #ordenar(orden) {
    try {
      await orden();
    } catch (error) {
      if (error instanceof ErrorApi && error.status === 404) {
        await this.sincronizar().catch(() => {});
      }
      throw traducir(error);
    }
    await this.sincronizar();
  }
}
