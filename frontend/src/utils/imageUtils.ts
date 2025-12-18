
/**
 * Converts an image URL to a base64 data URL
 * Supports SVG by converting to PNG via Canvas
 */
export async function toDataUrl(url?: string): Promise<string | null> {
  if (!url) return null;
  try {
    const resp = await fetch(url);
    const contentType = resp.headers.get('content-type') || '';
    
    if (contentType.includes('svg') || url.endsWith('.svg')) {
      // Converter SVG em PNG
      const svgText = await resp.text();
      const svgBlob = new Blob([svgText], { type: 'image/svg+xml' });
      const svgUrl = URL.createObjectURL(svgBlob);
      
      const img = new Image();
      const imgLoaded = new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
      });
      
      img.src = svgUrl;
      await imgLoaded;
      
      const canvas = document.createElement('canvas');
      // Alta resolução
      const targetWidth = 800; 
      const aspect = img.naturalWidth && img.naturalHeight ? img.naturalHeight / img.naturalWidth : 0.3;
      const targetHeight = Math.max(1, Math.round(targetWidth * aspect));
      
      canvas.width = targetWidth;
      canvas.height = targetHeight || 240;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }
      
      const dataUrl = canvas.toDataURL('image/png');
      URL.revokeObjectURL(svgUrl);
      return dataUrl;
    }
    
    // PNG/JPEG
    const blob = await resp.blob();
    const reader = new FileReader();
    return new Promise<string>((resolve, reject) => {
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn('Não foi possível carregar imagem:', e);
    return null;
  }
}
