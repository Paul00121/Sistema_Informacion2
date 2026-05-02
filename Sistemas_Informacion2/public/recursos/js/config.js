/**
 * Configuración centralizada del proyecto
 * Detecta automáticamente el entorno (localhost vs producción)
 */
const CONFIG = {
    // Detectar entorno automáticamente
    API_URL: (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://localhost:8090/api' 
        : 'https://api.proyectosi2.com', // Cambiar por el dominio real en producción
    
    // Tiempo de timeout para AJAX (en milisegundos)
    AJAX_TIMEOUT: 10000,
    
    // Versiones de dependencias recomendadas
    RECOMENDED_JQUERY: '3.7.1',
    
    // Configuración de elementos por página
    ITEMS_POR_PAGINA: 20
};

// Exponer para uso global (si es necesario)
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
}
