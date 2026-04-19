#!/usr/bin/env node

/**
 * Script temporal para limpiar shows vacíos (sin seasons)
 * 
 * Este script:
 * 1. Obtiene todos los shows
 * 2. Para cada show, verifica si tiene seasons
 * 3. Si un show no tiene seasons, lo elimina (soft delete)
 * 
 * Uso: node scripts/cleanup-empty-shows.js [--dry-run]
 */

const axios = require('axios');
require('dotenv').config();

// Configuración
const BASE_URL = process.env.BASE_URL;
const API_TOKEN = process.env.API_TOKEN;

// Opciones de línea de comandos
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');

if (!BASE_URL || !API_TOKEN) {
    console.error('Error: BASE_URL y API_TOKEN deben estar configurados en el .env');
    process.exit(1);
}

console.log('Obteniendo todos los shows (sin filtrar por cuenta)');

// Cliente HTTP con configuración común
const apiClient = axios.create({
    baseURL: BASE_URL,
    headers: {
        'X-API-Token': API_TOKEN,
        'Content-Type': 'application/json'
    },
    timeout: 30000
});

// Variables de seguimiento
let totalShows = 0;
let showsWithSeasons = 0;
let emptyShows = 0;
let deletedShows = 0;
let errors = 0;

/**
 * Obtiene todos los shows
 */
async function getAllShows() {
    try {
        console.log('Obteniendo todos los shows...');
        
        // Usamos el endpoint GET /api/show con los mismos parámetros que el curl
        const response = await apiClient.get('/api/show', {
            params: {
                admin: true,
                all: true,
                populate: false,
                limit: 1000 // Suficientemente grande para obtener todos
            }
        });

        if (!response.data) {
            throw new Error('No se recibieron datos en la respuesta');
        }

        // La API puede devolver { data: shows } o shows directamente
        const shows = response.data.data || response.data;
        
        if (!Array.isArray(shows)) {
            throw new Error('La respuesta no contiene un array de shows');
        }

        console.log(`Se encontraron ${shows.length} shows`);
        totalShows = shows.length;
        return shows;
    } catch (error) {
        console.error('Error obteniendo shows:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Verifica si un show tiene seasons
 */
async function hasSeasons(show) {
    try {
        // Verificar si el show tiene seasons
        if (show.seasons && Array.isArray(show.seasons) && show.seasons.length > 0) {
            console.log(`  Show "${show.title}" tiene ${show.seasons.length} seasons`);
            return true;
        }

        console.log(`  Show "${show.title}" no tiene seasons - ESTÁ VACÍO`);
        return false;
    } catch (error) {
        console.error(`Error verificando seasons para show "${show.title}":`, error.response?.data || error.message);
        return false;
    }
}

/**
 * Elimina un show (soft delete)
 */
async function deleteShow(show) {
    try {
        console.log(`  Eliminando show "${show.title}" (ID: ${show._id})`);
        
        if (isDryRun) {
            console.log(`  [DRY-RUN] Se eliminaría el show "${show.title}"`);
            return true;
        }

        const response = await apiClient.delete(`/api/show/${show._id}`);
        
        if (response.status === 200 || response.status === 204) {
            console.log(`  Show "${show.title}" eliminado exitosamente`);
            deletedShows++;
            return true;
        } else {
            console.error(`  Error inesperado eliminando show: Status ${response.status}`);
            return false;
        }
    } catch (error) {
        console.error(`Error eliminando show "${show.title}":`, error.response?.data || error.message);
        errors++;
        return false;
    }
}

/**
 * Función principal
 */
async function main() {
    console.log('=== Script de Limpieza de Shows Vacíos ===');
    console.log(`Modo: ${isDryRun ? 'DRY-RUN (simulación)' : 'EJECUCIÓN REAL'}`);
    console.log(`Base URL: ${BASE_URL}`);
    console.log('');

    try {
        // Obtener todos los shows
        const shows = await getAllShows();
        
        if (shows.length === 0) {
            console.log('No se encontraron shows para procesar.');
            return;
        }

        console.log('Procesando shows...\n');

        // Procesar cada show
        for (let i = 0; i < shows.length; i++) {
            const show = shows[i];
            console.log(`[${i + 1}/${shows.length}] Procesando: "${show.title}" (ID: ${show._id})`);

            // Verificar si tiene seasons
            const hasSeasonsFlag = await hasSeasons(show);
            
            if (hasSeasonsFlag) {
                showsWithSeasons++;
            } else {
                emptyShows++;
                // Eliminar el show vacío
                await deleteShow(show);
            }

            console.log(''); // Línea en blanco para separación
        }

        // Resumen final
        console.log('=== RESUMEN ===');
        console.log(`Total shows procesados: ${totalShows}`);
        console.log(`Shows con seasons: ${showsWithSeasons}`);
        console.log(`Shows vacíos encontrados: ${emptyShows}`);
        console.log(`Shows eliminados: ${deletedShows}`);
        console.log(`Errores: ${errors}`);
        
        if (isDryRun) {
            console.log('\n[DRY-RUN] No se realizó ninguna eliminación. Ejecute sin --dry-run para eliminar los shows.');
        }

    } catch (error) {
        console.error('Error fatal en el script:', error.message);
        process.exit(1);
    }
}

// Ejecutar script
if (require.main === module) {
    main().catch(error => {
        console.error('Error no manejado:', error);
        process.exit(1);
    });
}

module.exports = { main, hasSeasons, deleteShow, getAllShows };
