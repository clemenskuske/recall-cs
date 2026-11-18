import katex from 'katex';
export const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function rich(text) {
  return String(text).split(/(\$\$[\s\S]*?\$\$|\$[^$\n]+\$)/g).map(piece => {
    if (piece.startsWith('$') && piece.endsWith('$')) {
      const displayMode = piece.startsWith('$$');
      return katex.renderToString(piece.slice(displayMode ? 2 : 1, displayMode ? -2 : -1), {throwOnError:false,trust:false,displayMode,strict:'ignore'});
    }
    return escapeHTML(piece).replace(/\n/g,'<br>');
  }).join('');
}
