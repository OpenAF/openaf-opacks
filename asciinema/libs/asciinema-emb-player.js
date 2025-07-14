/**
 * Asciinema Embedded Player
 * Automatically creates an asciinema player when a 'record' parameter is provided in the URL
 * or when a script tag includes a data-record attribute.
 * 
 * This script automatically injects the necessary asciinema-player CSS and JS dependencies
 * 
 * Author: Nuno Aguiar
 * 
 * Usage: 
 * Only include the emb-player script; the asciinema-player library will be loaded automatically.
 * Method: <script src="asciinema-emb-player.js" data-record="/path/to/recording.cast" data-id="targetElementId"></script>
 */

(function() {
    'use strict';

    // Function to get URL parameters
    function getURLParameter(name) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
    }

    // Function to get record URL from script tag or URL parameter
    function getRecordUrl() {
        // First, try to get from the current script tag's data-record attribute
        const currentScript = document.currentScript;
        if (currentScript && currentScript.dataset.record) {
            return currentScript.dataset.record;
        }

        // Fallback to checking all script tags for asciinema-emb-player.js with data-record
        const scripts = document.querySelectorAll('script[src*="asciinema-emb-player.js"]');
        for (const script of scripts) {
            if (script.dataset.record) {
                return script.dataset.record;
            }
        }

        // Finally, fallback to URL parameter
        return getURLParameter('record');
    }

    // Function to create the player container
    function createPlayerContainer() {
        const container = document.createElement('div');
        // use a class, not an id (so you can have multiple)
        container.className = 'asciinema-player-container';
        container.style.cssText = `
            margin: 20px auto;
            padding: 20px;
            box-sizing: border-box;
            display: table;
        `;
        return container;
    }

    // Function to create player element
    function createPlayerElement() {
        const playerElement = document.createElement('div');
        playerElement.id = 'asciinema-player';
        return playerElement;
    }

    // Function to initialize the asciinema player with optional overrides
    function initializePlayer(recordUrl, playerElement, options = {}) {
        // Check if AsciinemaPlayer is available
        if (typeof AsciinemaPlayer === 'undefined') {
            console.error('AsciinemaPlayer is not loaded. Please include asciinema-player.js');
            return;
        }

        try {
            // Merge default options with any overrides
            const defaultOpts = {
                cols: 80,
                rows: 24,
                autoPlay: false,
                preload: true,
                controls: true,
                loop: false,
                startAt: 0,
                speed: 1,
                idleTimeLimit: 2,
                theme: 'asciinema',
                poster: 'npt:0:01'
            };
            const playerOpts = Object.assign({}, defaultOpts, options);
            // Create the player with merged options
            AsciinemaPlayer.create(recordUrl, playerElement, playerOpts);
        } catch (error) {
            console.error('Error initializing asciinema player:', error);
            playerElement.innerHTML = `
                <div style="padding: 20px; border: 1px solid #ccc; background: #f5f5f5; text-align: center;">
                    <h3>Error loading recording</h3>
                    <p>Could not load the asciinema recording: ${recordUrl}</p>
                    <p>Error: ${error.message}</p>
                </div>
            `;
        }
    }

    // Function to inject asciinema CSS
    function injectAsciinemaCSS() {
        // Check if asciinema CSS is already loaded
        const existingCSS = document.querySelector('link[href*="asciinema-player"]');
        if (existingCSS) return;

        const cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.type = 'text/css';
        cssLink.href = '/css/asciinema-player.min.css';
        document.head.appendChild(cssLink);
    }

    // Function to inject asciinema JavaScript
    function injectAsciinemaJS() {
        return new Promise((resolve) => {
            // Check if asciinema JS is already loaded
            if (typeof AsciinemaPlayer !== 'undefined') {
                resolve();
                return;
            }

            const existingScript = document.querySelector('script[src*="asciinema-player"]');
            if (existingScript) {
                // Script exists but may not be loaded yet, wait for it
                existingScript.addEventListener('load', resolve);
                existingScript.addEventListener('error', resolve);
                return;
            }

            const script = document.createElement('script');
            script.src = '/js/asciinema-player.min.js';
            script.addEventListener('load', resolve);
            script.addEventListener('error', resolve);
            document.head.appendChild(script);
        });
    }

    // Function to inject basic styles if not present
    function injectBasicStyles() {
        const existingStyles = document.querySelector('#asciinema-emb-styles');
        if (existingStyles) return;

        const styles = document.createElement('style');
        styles.id = 'asciinema-emb-styles';
        styles.textContent = `
            .asciinema-player-container {
                font-family: 'Courier New', monospace;
            }
            .asciinema-player-wrapper {
                background: #000;
                border-radius: 4px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            }
            .error-container {
                padding: 20px;
                border: 1px solid #dc3545;
                background: #f8d7da;
                color: #721c24;
                border-radius: 4px;
                text-align: center;
            }
        `;
        document.head.appendChild(styles);
    }

    // Function to show error message
    function showError(message, details = '') {
        const container = createPlayerContainer();
        container.innerHTML = `
            <div class="error-container">
                <h3>❌ ${message}</h3>
                ${details ? `<p>${details}</p>` : ''}
                <p>Make sure the 'record' parameter points to a valid .cast file on this server.</p>
            </div>
        `;
        
        // Insert error container after script tag if possible, else append to body
        const currentScript = document.currentScript;
        if (currentScript && currentScript.parentNode) {
            currentScript.parentNode.insertBefore(container, currentScript.nextSibling);
        } else {
            document.body.appendChild(container);
        }
    }

    // Main initialization function
    async function init() {
        // Get the record URL from script tag or URL parameter
        var recordParam = getRecordUrl();
        
        if (recordParam) {
            recordParam += "?raw=true";
        }
        
        if (!recordParam) {
            console.warn('No "record" parameter found in URL or script tag. Asciinema player will not be initialized.');
            return;
        }

        // Clean and validate the record URL
        let recordUrl = recordParam.trim();
        
        // If it's a relative path, make it absolute to current domain
        if (recordUrl.startsWith('/')) {
            recordUrl = window.location.origin + recordUrl;
        } else if (!recordUrl.match(/^https?:\/\//)) {
            // If it doesn't start with protocol, assume it's relative to current path
            recordUrl = window.location.origin + '/' + recordUrl.replace(/^\.?\//, '');
        }

        console.log('Initializing asciinema player for:', recordUrl);

        // Inject asciinema CSS and JS dependencies
        injectAsciinemaCSS();
        
        try {
            await injectAsciinemaJS();
        } catch (error) {
            showError(
                'Failed to Load Asciinema Player', 
                'Could not load the asciinema-player.js library from the server.'
            );
            return;
        }

        // Inject basic styles
        injectBasicStyles();

        // Wait a bit more for the AsciinemaPlayer to be available
        let attempts = 0;
        const maxAttempts = 30;
        while (typeof AsciinemaPlayer === 'undefined' && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (typeof AsciinemaPlayer === 'undefined') {
            showError(
                'Asciinema Player Not Available', 
                'The asciinema-player.js library failed to initialize properly.'
            );
            return;
        }

        // Create player container and element
        const container = createPlayerContainer();
        const playerElement = createPlayerElement();
        container.appendChild(playerElement);

        // Insert player container right after script tag if possible, else append to body
        const currentScript = document.currentScript;
        if (currentScript && currentScript.parentNode) {
            currentScript.parentNode.insertBefore(container, currentScript.nextSibling);
        } else {
            document.body.appendChild(container);
        }

        // Initialize the player
        initializePlayer(recordUrl, playerElement);
    }

    // Automatically initialize players for each script tag instance after DOM load
    document.addEventListener('DOMContentLoaded', async () => {
        // Inject dependencies once, before any player initialization
        injectAsciinemaCSS();
        try {
            await injectAsciinemaJS();
        } catch (error) {
            console.error('Failed to load asciinema-player.js:', error);
            return;
        }
        injectBasicStyles();
        // Wait for AsciinemaPlayer library
        let attempts = 0;
        const maxAttempts = 30;
        while (typeof AsciinemaPlayer === 'undefined' && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        if (typeof AsciinemaPlayer === 'undefined') {
            console.error('AsciinemaPlayer not available');
            return;
        }
        // Now safe to initialize all players
        const scripts = document.querySelectorAll('script[src*="asciinema-emb-player.js"]');
        scripts.forEach(script => {
            const rec = script.dataset.record;
            if (!rec) return; // skip scripts without data-record
            // Build record URL with raw=true
            let recordParam = rec;
            if (recordParam) recordParam += '?raw=true';
            let recordUrl = recordParam.trim();
            if (recordUrl.startsWith('/')) {
                recordUrl = window.location.origin + recordUrl;
            } else if (!recordUrl.match(/^https?:\/\//)) {
                recordUrl = window.location.origin + '/' + recordUrl.replace(/^\.?\//, '');
            }
            // Create container and player elements
            const container = createPlayerContainer();
            const playerElement = createPlayerElement();
            container.appendChild(playerElement);
            // Apply optional sizing from data-width/data-height
            if (script.dataset.width) {
                container.style.width = script.dataset.width;
            } else {
                container.style.width = '100%'; // default to full width
            }
            // Insert container into specified target or after script
            if (script.dataset.id) {
                const targetEl = document.getElementById(script.dataset.id);
                const isInline = targetEl && window.getComputedStyle(targetEl).display === 'inline';
                if (targetEl && !isInline) {
                    targetEl.appendChild(container);
                } else if (script.parentNode) {
                    // fallback: insert after script
                    script.parentNode.insertBefore(container, script.nextSibling);
                } else {
                    document.body.appendChild(container);
                }
            } else if (script.parentNode) {
                script.parentNode.insertBefore(container, script.nextSibling);
            } else {
                document.body.appendChild(container);
            }
            // Gather player options from data- attributes
            const opts = {};
            if (script.dataset.cols) opts.cols = parseInt(script.dataset.cols, 10);
            if (script.dataset.rows) opts.rows = parseInt(script.dataset.rows, 10);
            if (script.dataset.autoplay) opts.autoPlay = script.dataset.autoplay === 'true';
            if (script.dataset.preload) opts.preload = script.dataset.preload === 'true';
            if (script.dataset.controls) opts.controls = script.dataset.controls === 'true';
            if (script.dataset.loop) opts.loop = script.dataset.loop === 'true';
            if (script.dataset.startat) opts.startAt = parseFloat(script.dataset.startat);
            if (script.dataset.speed) opts.speed = parseFloat(script.dataset.speed);
            if (script.dataset.idletimelimit) opts.idleTimeLimit = parseFloat(script.dataset.idletimelimit);
            if (script.dataset.theme) opts.theme = script.dataset.theme;
            if (script.dataset.poster) opts.poster = script.dataset.poster;
            // Initialize the player with custom options
            initializePlayer(recordUrl, playerElement, opts);
        });
    });

    // Expose a global function for manual initialization if needed
    window.AsciinemaEmbPlayer = {
        init: init,
        createPlayer: function(recordUrl, targetElement, options = {}) {
            injectAsciinemaJS()
            if (typeof AsciinemaPlayer === 'undefined') {
                console.error('AsciinemaPlayer is not loaded');
                return;
            }
            
            AsciinemaPlayer.create(recordUrl, targetElement, {
                cols: 80,
                rows: 24,
                autoPlay: false,
                preload: true,
                controls: true,
                loop: false,
                startAt: 0,
                speed: 1,
                idleTimeLimit: 2,
                theme: 'asciinema',
                poster: 'npt:0:01',
                ...options
            });
        }
    };

})();