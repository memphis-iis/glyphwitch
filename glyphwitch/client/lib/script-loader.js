/**
 * Script Loader Utility
 * 
 * Ensures external scripts are properly loaded before using them
 */

export const ScriptLoader = {
  loadedScripts: {},
  
  /**
   * Loads a script and returns a promise that resolves when the script is loaded
   * @param {String} url - URL of the script
   * @param {String} id - ID to assign to the script tag
   * @returns {Promise} - Resolves when script is loaded
   */
  loadScript(url, id) {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (this.loadedScripts[id]) {
        console.log(`Script ${id} already loaded`);
        return resolve(this.loadedScripts[id]);
      }
      
      // Check if script tag already exists in DOM
      const existingScript = document.getElementById(id);
      if (existingScript) {
        console.log(`Script ${id} already in DOM`);
        this.loadedScripts[id] = true;
        return resolve(true);
      }
      
      console.log(`Loading script: ${url}`);
      const script = document.createElement('script');
      script.id = id;
      script.src = url;
      script.async = true;
      
      script.onload = () => {
        console.log(`Script ${id} loaded successfully`);
        this.loadedScripts[id] = true;
        resolve(true);
      };
      
      script.onerror = (error) => {
        console.error(`Error loading script ${id}:`, error);
        reject(new Error(`Failed to load script: ${url}`));
      };
      
      document.body.appendChild(script);
    });
  },
  
  /**
   * Loads a CSS file
   * @param {String} url - URL of the CSS file
   * @param {String} id - ID to assign to the link tag
   * @returns {Promise} - Resolves when CSS is loaded
   */
  loadCSS(url, id) {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (this.loadedScripts[id]) {
        console.log(`CSS ${id} already loaded`);
        return resolve(this.loadedScripts[id]);
      }
      
      // Check if link tag already exists in DOM
      const existingLink = document.getElementById(id);
      if (existingLink) {
        console.log(`CSS ${id} already in DOM`);
        this.loadedScripts[id] = true;
        return resolve(true);
      }
      
      console.log(`Loading CSS: ${url}`);
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = url;
      
      link.onload = () => {
        console.log(`CSS ${id} loaded successfully`);
        this.loadedScripts[id] = true;
        resolve(true);
      };
      
      link.onerror = (error) => {
        console.error(`Error loading CSS ${id}:`, error);
        reject(new Error(`Failed to load CSS: ${url}`));
      };
      
      document.head.appendChild(link);
    });
  },
  
  /**
   * Ensures jQuery and jsTree are loaded
   * @returns {Promise} - Resolves when both libraries are ready
   */
  ensureJsTree() {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if jQuery is already available
        if (typeof $ === 'undefined') {
          await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js', 'jquery-script');
        }
        
        // Check if jsTree is already available
        if (typeof $.fn.jstree === 'undefined') {
          await this.loadCSS('https://cdnjs.cloudflare.com/ajax/libs/jstree/3.3.12/themes/default/style.min.css', 'jstree-css');
          await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jstree/3.3.12/jstree.min.js', 'jstree-script');
        }
        
        // Final check to ensure jsTree is now available
        if (typeof $.fn.jstree === 'undefined') {
          throw new Error('jsTree still not available after loading scripts');
        }
        
        console.log('jQuery and jsTree successfully loaded and verified');
        resolve(true);
      } catch (error) {
        console.error('Failed to ensure jsTree is loaded:', error);
        reject(error);
      }
    });
  },
  
  /**
   * Checks if jsTree is loaded
   * @returns {Boolean} - True if jsTree is loaded
   */
  isJsTreeLoaded() {
    return typeof $ !== 'undefined' && typeof $.fn.jstree !== 'undefined';
  }
};
