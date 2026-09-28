/* Configuración de Mesa Austral.
 * API_URL vacío = «modo prueba»: todo funciona dentro de este navegador con datos inventados.
 * Cuando esté el Worker en Cloudflare, poner su dirección, por ejemplo:
 *   API_URL: 'https://mesa-austral.tu-usuario.workers.dev'
 */
export const CONFIG = {
  API_URL: '',
  RESTO: 'fogon',          // restaurante que abre la página de reservas si el enlace no dice otro (?r=…)
  VERSION: '0.1.0',
};
