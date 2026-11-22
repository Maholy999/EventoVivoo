/**
 * Provee imágenes temáticas de alta calidad y estética para las sesiones de EventoVivo.
 * Mezcla fotografía curada de eventos académicos/tecnológicos y paletas elegantes.
 */

export interface EventImage {
  url: string;
  alt: string;
  accentColor: string;
}

const TYPE_IMAGES: Record<string, EventImage> = {
  taller: {
    url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80',
    alt: 'Taller práctico de tecnología y desarrollo',
    accentColor: '#1E6B4F',
  },
  hackatón: {
    url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=80',
    alt: 'Hackatón universitario de innovación y programación',
    accentColor: '#E8440F',
  },
  conferencia: {
    url: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=800&q=80',
    alt: 'Conferencia magistral en auditorio',
    accentColor: '#16130F',
  },
  encuentro: {
    url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80',
    alt: 'Encuentro y networking de comunidades estudiantiles',
    accentColor: '#B7700B',
  },
};

export function getSessionImage(type: string, title?: string): EventImage {
  const lowerType = (type || '').toLowerCase();
  const lowerTitle = (title || '').toLowerCase();

  if (lowerTitle.includes('robot') || lowerTitle.includes('hardware')) {
    return {
      url: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=800&q=80',
      alt: 'Robótica y automatización',
      accentColor: '#16130F',
    };
  }

  if (lowerTitle.includes('ia') || lowerTitle.includes('inteligencia') || lowerTitle.includes('deep learning')) {
    return {
      url: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=800&q=80',
      alt: 'Inteligencia Artificial y Aprendizaje Automático',
      accentColor: '#E8440F',
    };
  }

  if (lowerTitle.includes('ciberseguridad') || lowerTitle.includes('seguridad')) {
    return {
      url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80',
      alt: 'Ciberseguridad y análisis defensivo',
      accentColor: '#1E6B4F',
    };
  }

  if (lowerTitle.includes('ux') || lowerTitle.includes('diseño') || lowerTitle.includes('interfaz')) {
    return {
      url: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=800&q=80',
      alt: 'Diseño UX y arquitectura de información',
      accentColor: '#B7700B',
    };
  }

  if (lowerTitle.includes('web') || lowerTitle.includes('fullstack') || lowerTitle.includes('react')) {
    return {
      url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80',
      alt: 'Desarrollo Web Moderno',
      accentColor: '#E8440F',
    };
  }

  return TYPE_IMAGES[lowerType] || TYPE_IMAGES.taller;
}
