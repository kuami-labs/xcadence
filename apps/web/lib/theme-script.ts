/** Clé du choix de thème dans le navigateur ; absente, on suit le thème du système. */
export const THEME_KEY = 'xc-theme';

/**
 * Script exécuté avant l'affichage (app/layout.tsx) : pose la classe `dark` sur <html> sans
 * flash du mauvais thème. Rien n'est lu côté serveur : la page reste statique.
 */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_KEY}');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;var e=document.documentElement;e.classList.toggle('dark',d);e.style.colorScheme=d?'dark':'light'}catch(_){}})()`;
