/**
 * Generador de imágenes e ilustraciones vectoriales SVG únicas para EventoVivo.
 * - 100% locales en Data-URI (nunca se rompen, no dependen de internet ni de Unsplash).
 * - Cada evento tiene una ilustración y paleta visual única según su temática y ID.
 * - Respeta la dirección de arte "programa impreso" (papel, tinta, acentos nítidos y monoespaciados).
 */

export interface EventImage {
  url: string;
  alt: string;
  accentColor: string;
}

function escapeXml(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function hashEventSeed(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

interface ThemeConfig {
  icon: string; // SVG path / elements
  tag: string;
  bgGradStart: string;
  bgGradEnd: string;
  accentColor: string;
  patternType: 'grid' | 'dots' | 'isometric' | 'waves';
}

function getThemeForEvent(type: string, title?: string, description?: string): ThemeConfig {
  const t = (title || '').toLowerCase();
  const d = (description || '').toLowerCase();
  const subject = `${t} ${d}`;
  const cat = (type || '').toLowerCase();

  // Temas específicos: deben evaluarse antes de reglas generales por categoría.
  if (subject.includes('web3') || subject.includes('blockchain') || subject.includes('defi') || subject.includes('contratos inteligentes')) {
    return {
      tag: 'WEB3 & BLOCKCHAIN',
      accentColor: '#B7700B',
      bgGradStart: '#17130D',
      bgGradEnd: '#302817',
      patternType: 'isometric',
      icon: `
        <path d="M50 16 L76 31 L76 62 L50 78 L24 62 L24 31 Z" fill="none" stroke="#FFFFFF" stroke-width="3" />
        <path d="M24 31 L50 46 L76 31 M50 46 L50 78 M24 62 L50 46 L76 62" fill="none" stroke="#DDD7CC" stroke-width="2" />
        <circle cx="50" cy="46" r="7" fill="#E8440F" />
      `,
    };
  }

  if (subject.includes('agentes inteligentes') || subject.includes('llms') || subject.includes('mcp') || subject.includes('multi-agente')) {
    return {
      tag: 'AGENTIC AI & LLMS',
      accentColor: '#E8440F',
      bgGradStart: '#1D1511',
      bgGradEnd: '#3A241A',
      patternType: 'dots',
      icon: `
        <rect x="38" y="38" width="24" height="24" rx="4" fill="#E8440F" />
        <circle cx="50" cy="24" r="7" fill="#FFFFFF" />
        <circle cx="24" cy="50" r="7" fill="#FFFFFF" />
        <circle cx="76" cy="50" r="7" fill="#FFFFFF" />
        <circle cx="50" cy="76" r="7" fill="#FFFFFF" />
        <line x1="50" y1="31" x2="50" y2="38" stroke="#FFFFFF" stroke-width="2.5" />
        <line x1="31" y1="50" x2="38" y2="50" stroke="#FFFFFF" stroke-width="2.5" />
        <line x1="62" y1="50" x2="69" y2="50" stroke="#FFFFFF" stroke-width="2.5" />
        <line x1="50" y1="62" x2="50" y2="69" stroke="#FFFFFF" stroke-width="2.5" />
      `,
    };
  }

  if (subject.includes('react') || subject.includes('canvas') || subject.includes('visualización de datos')) {
    return {
      tag: 'DATA VISUALIZATION',
      accentColor: '#B7700B',
      bgGradStart: '#172027',
      bgGradEnd: '#2A3A44',
      patternType: 'grid',
      icon: `
        <rect x="22" y="22" width="56" height="56" rx="4" fill="none" stroke="#FFFFFF" stroke-width="3" />
        <path d="M30 68 L30 58 L42 58 L42 48 L54 48 L54 36 L66 36 L66 28" fill="none" stroke="#E8440F" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
        <circle cx="30" cy="68" r="3" fill="#FFFFFF" />
        <circle cx="66" cy="28" r="3" fill="#FFFFFF" />
      `,
    };
  }

  if (subject.includes('k6') || subject.includes('playwright') || subject.includes('performance') || subject.includes('pruebas automatizadas')) {
    return {
      tag: 'TESTING & PERFORMANCE',
      accentColor: '#1E6B4F',
      bgGradStart: '#111C17',
      bgGradEnd: '#263A30',
      patternType: 'grid',
      icon: `
        <circle cx="50" cy="50" r="30" fill="none" stroke="#FFFFFF" stroke-width="3" />
        <path d="M50 20 A30 30 0 0 1 72 73" fill="none" stroke="#E8440F" stroke-width="5" />
        <path d="M50 50 L66 34" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" />
        <circle cx="50" cy="50" r="5" fill="#E8440F" />
      `,
    };
  }

  if (subject.includes('líder') || subject.includes('liderazgo') || subject.includes('mentoría') || subject.includes('mentoria')) {
    return {
      tag: 'LEADERSHIP & MENTORSHIP',
      accentColor: '#B7700B',
      bgGradStart: '#211A10',
      bgGradEnd: '#3C3020',
      patternType: 'dots',
      icon: `
        <circle cx="50" cy="28" r="10" fill="none" stroke="#FFFFFF" stroke-width="3" />
        <circle cx="28" cy="62" r="8" fill="none" stroke="#B7700B" stroke-width="3" />
        <circle cx="72" cy="62" r="8" fill="none" stroke="#B7700B" stroke-width="3" />
        <path d="M32 54 C36 42 44 38 50 38 C56 38 64 42 68 54" fill="none" stroke="#FFFFFF" stroke-width="3" />
        <line x1="28" y1="70" x2="28" y2="78" stroke="#E8440F" stroke-width="3" />
        <line x1="72" y1="70" x2="72" y2="78" stroke="#E8440F" stroke-width="3" />
      `,
    };
  }

  if (subject.includes('curvas elípticas') || subject.includes('criptografía') || subject.includes('criptografia') || subject.includes('cuántica') || subject.includes('quantum')) {
    return {
      tag: 'CRYPTOGRAPHY & QUANTUM',
      accentColor: '#B7700B',
      bgGradStart: '#17160F',
      bgGradEnd: '#302A1B',
      patternType: 'isometric',
      icon: `
        <ellipse cx="50" cy="50" rx="34" ry="12" fill="none" stroke="#DDD7CC" stroke-width="2.5" transform="rotate(25 50 50)" />
        <ellipse cx="50" cy="50" rx="34" ry="12" fill="none" stroke="#DDD7CC" stroke-width="2.5" transform="rotate(-25 50 50)" />
        <ellipse cx="50" cy="50" rx="34" ry="12" fill="none" stroke="#B7700B" stroke-width="2.5" transform="rotate(90 50 50)" />
        <circle cx="50" cy="50" r="7" fill="#E8440F" />
      `,
    };
  }

  if (subject.includes('ciudades inteligentes') || subject.includes('iot') || subject.includes('lorawan') || subject.includes('sensores')) {
    return {
      tag: 'SMART CITIES & IOT',
      accentColor: '#1E6B4F',
      bgGradStart: '#101B1A',
      bgGradEnd: '#223A37',
      patternType: 'grid',
      icon: `
        <rect x="24" y="48" width="12" height="30" fill="none" stroke="#FFFFFF" stroke-width="3" />
        <rect x="44" y="34" width="12" height="44" fill="none" stroke="#FFFFFF" stroke-width="3" />
        <rect x="64" y="40" width="12" height="38" fill="none" stroke="#FFFFFF" stroke-width="3" />
        <circle cx="50" cy="22" r="5" fill="#E8440F" />
        <path d="M38 24 C42 16 58 16 62 24 M34 30 C40 18 60 18 66 30" fill="none" stroke="#FFFFFF" stroke-width="2" />
      `,
    };
  }

  if (subject.includes('investigación doctoral') || subject.includes('doctorado') || subject.includes('postgrado') || subject.includes('becas')) {
    return {
      tag: 'DOCTORAL RESEARCH',
      accentColor: '#B7700B',
      bgGradStart: '#1B1811',
      bgGradEnd: '#332B1C',
      patternType: 'dots',
      icon: `
        <path d="M18 42 L50 24 L82 42 L50 60 Z" fill="none" stroke="#FFFFFF" stroke-width="3" />
        <path d="M30 48 V68 C30 68 50 80 70 68 V48" fill="none" stroke="#DDD7CC" stroke-width="3" />
        <line x1="82" y1="42" x2="82" y2="68" stroke="#E8440F" stroke-width="3" />
        <circle cx="82" cy="72" r="4" fill="#E8440F" />
      `,
    };
  }

  if (subject.includes('ética') || subject.includes('etica') || subject.includes('sesgos') || subject.includes('gobernanza')) {
    return {
      tag: 'AI ETHICS & GOVERNANCE',
      accentColor: '#B7700B',
      bgGradStart: '#1E1A14',
      bgGradEnd: '#37301F',
      patternType: 'grid',
      icon: `
        <circle cx="50" cy="50" r="32" fill="none" stroke="#FFFFFF" stroke-width="3" />
        <path d="M50 20 V80 M20 50 H80" stroke="#B7700B" stroke-width="2" />
        <path d="M50 27 L60 42 L55 58 L45 58 L40 42 Z" fill="none" stroke="#E8440F" stroke-width="3" />
        <circle cx="50" cy="50" r="5" fill="#FFFFFF" />
      `,
    };
  }

  // 1. Arquitectura Limpia / DDD
  if (t.includes('arquitectura') || t.includes('ddd') || t.includes('limpia')) {
    return {
      tag: 'SOFTWARE ARCHITECTURE',
      accentColor: '#1E6B4F',
      bgGradStart: '#11221A',
      bgGradEnd: '#1E3B2E',
      patternType: 'grid',
      icon: `
        <rect x="20" y="20" width="60" height="60" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-dasharray="4 4" />
        <rect x="32" y="32" width="36" height="36" fill="none" stroke="#E8440F" stroke-width="3" />
        <circle cx="50" cy="50" r="8" fill="#FFFFFF" />
        <path d="M50 20 L50 32 M50 68 L50 80 M20 50 L32 50 M68 50 L80 50" stroke="#FFFFFF" stroke-width="3" />
      `,
    };
  }

  // 2. IA Generativa / Deep Learning / Machine Learning
  if (t.includes('ia') || t.includes('generativa') || t.includes('machine learning') || t.includes('inteligencia')) {
    return {
      tag: 'ARTIFICIAL INTELLIGENCE',
      accentColor: '#E8440F',
      bgGradStart: '#1E1410',
      bgGradEnd: '#331B12',
      patternType: 'dots',
      icon: `
        <circle cx="50" cy="50" r="14" fill="#E8440F" />
        <circle cx="28" cy="34" r="8" fill="#FFFFFF" />
        <circle cx="72" cy="34" r="8" fill="#FFFFFF" />
        <circle cx="28" cy="66" r="8" fill="#FFFFFF" />
        <circle cx="72" cy="66" r="8" fill="#FFFFFF" />
        <line x1="28" y1="34" x2="50" y2="50" stroke="#DDD7CC" stroke-width="2.5" />
        <line x1="72" y1="34" x2="50" y2="50" stroke="#DDD7CC" stroke-width="2.5" />
        <line x1="28" y1="66" x2="50" y2="50" stroke="#DDD7CC" stroke-width="2.5" />
        <line x1="72" y1="66" x2="50" y2="50" stroke="#DDD7CC" stroke-width="2.5" />
        <line x1="28" y1="34" x2="72" y2="34" stroke="#5E584F" stroke-width="1.5" stroke-dasharray="3 3" />
        <line x1="28" y1="66" x2="72" y2="66" stroke="#5E584F" stroke-width="1.5" stroke-dasharray="3 3" />
      `,
    };
  }

  // 3. Ciberseguridad / Pentesting
  if (t.includes('ciberseguridad') || t.includes('pentesting') || t.includes('seguridad')) {
    return {
      tag: 'CYBERSECURITY & DEFENSE',
      accentColor: '#1E6B4F',
      bgGradStart: '#0C1C16',
      bgGradEnd: '#193429',
      patternType: 'grid',
      icon: `
        <path d="M50 16 L76 26 C76 54 50 78 50 78 C50 78 24 54 24 26 Z" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linejoin="round" />
        <rect x="42" y="44" width="16" height="14" rx="2" fill="#E8440F" />
        <path d="M45 44 V38 C45 35 47 33 50 33 C53 33 55 35 55 38 V44" fill="none" stroke="#FFFFFF" stroke-width="3" />
      `,
    };
  }

  // 4. Computación Cuántica / Criptografía
  if (t.includes('cuántica') || t.includes('cuantica') || t.includes('criptografía') || t.includes('criptografia')) {
    return {
      tag: 'QUANTUM COMPUTING',
      accentColor: '#B7700B',
      bgGradStart: '#1A1813',
      bgGradEnd: '#2D271B',
      patternType: 'isometric',
      icon: `
        <ellipse cx="50" cy="50" rx="36" ry="14" fill="none" stroke="#DDD7CC" stroke-width="2" transform="rotate(30 50 50)" />
        <ellipse cx="50" cy="50" rx="36" ry="14" fill="none" stroke="#DDD7CC" stroke-width="2" transform="rotate(-30 50 50)" />
        <ellipse cx="50" cy="50" rx="36" ry="14" fill="none" stroke="#B7700B" stroke-width="2.5" transform="rotate(90 50 50)" />
        <circle cx="50" cy="50" r="8" fill="#E8440F" />
      `,
    };
  }

  // 5. Aplicaciones Móviles
  if (t.includes('móvil') || t.includes('movil') || t.includes('móviles') || t.includes('moviles') || t.includes('app')) {
    return {
      tag: 'MOBILE DEVELOPMENT',
      accentColor: '#E8440F',
      bgGradStart: '#201614',
      bgGradEnd: '#381C15',
      patternType: 'grid',
      icon: `
        <rect x="32" y="16" width="36" height="66" rx="6" fill="none" stroke="#FFFFFF" stroke-width="3.5" />
        <line x1="44" y1="22" x2="56" y2="22" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" />
        <circle cx="50" cy="74" r="3" fill="#E8440F" />
        <rect x="38" y="28" width="24" height="38" fill="#16130F" />
        <path d="M44 42 L48 46 L44 50 M52 50 L56 50" stroke="#E8440F" stroke-width="2" stroke-linecap="round" />
      `,
    };
  }

  // 6. Diseño UX / UI e Interfaces
  if (t.includes('ux') || t.includes('ui') || t.includes('diseño') || t.includes('interfaz') || t.includes('interfaces')) {
    return {
      tag: 'UX / UI DESIGN',
      accentColor: '#B7700B',
      bgGradStart: '#221D17',
      bgGradEnd: '#3A3022',
      patternType: 'grid',
      icon: `
        <rect x="22" y="22" width="56" height="42" rx="4" fill="none" stroke="#FFFFFF" stroke-width="3" />
        <line x1="22" y1="32" x2="78" y2="32" stroke="#FFFFFF" stroke-width="2" />
        <circle cx="28" cy="27" r="2" fill="#E8440F" />
        <circle cx="34" cy="27" r="2" fill="#B7700B" />
        <circle cx="40" cy="27" r="2" fill="#1E6B4F" />
        <rect x="28" y="38" width="20" height="20" fill="#B7700B" opacity="0.8" />
        <path d="M54 44 L68 54 L60 56 L64 64 L60 66 L56 58 L50 62 Z" fill="#FFFFFF" stroke="#16130F" stroke-width="1.5" />
      `,
    };
  }

  // 7. Robótica y Hardware Libre
  if (t.includes('robótica') || t.includes('robotica') || t.includes('hardware') || t.includes('iot')) {
    return {
      tag: 'ROBOTICS & HARDWARE',
      accentColor: '#16130F',
      bgGradStart: '#141416',
      bgGradEnd: '#25262B',
      patternType: 'grid',
      icon: `
        <rect x="30" y="30" width="40" height="40" rx="3" fill="#16130F" stroke="#E8440F" stroke-width="3" />
        <circle cx="50" cy="50" r="10" fill="#E8440F" />
        <line x1="38" y1="20" x2="38" y2="30" stroke="#FFFFFF" stroke-width="3" />
        <line x1="50" y1="20" x2="50" y2="30" stroke="#FFFFFF" stroke-width="3" />
        <line x1="62" y1="20" x2="62" y2="30" stroke="#FFFFFF" stroke-width="3" />
        <line x1="38" y1="70" x2="38" y2="80" stroke="#FFFFFF" stroke-width="3" />
        <line x1="50" y1="70" x2="50" y2="80" stroke="#FFFFFF" stroke-width="3" />
        <line x1="62" y1="70" x2="62" y2="80" stroke="#FFFFFF" stroke-width="3" />
        <line x1="20" y1="40" x2="30" y2="40" stroke="#FFFFFF" stroke-width="3" />
        <line x1="20" y1="50" x2="30" y2="50" stroke="#FFFFFF" stroke-width="3" />
        <line x1="20" y1="60" x2="30" y2="60" stroke="#FFFFFF" stroke-width="3" />
        <line x1="70" y1="40" x2="80" y2="40" stroke="#FFFFFF" stroke-width="3" />
        <line x1="70" y1="50" x2="80" y2="50" stroke="#FFFFFF" stroke-width="3" />
        <line x1="70" y1="60" x2="80" y2="60" stroke="#FFFFFF" stroke-width="3" />
      `,
    };
  }

  // 8. Infraestructura en la Nube / DevOps
  if (t.includes('nube') || t.includes('cloud') || t.includes('devops') || t.includes('infraestructura')) {
    return {
      tag: 'CLOUD & DEVOPS',
      accentColor: '#1E6B4F',
      bgGradStart: '#0F1A24',
      bgGradEnd: '#1E2D3B',
      patternType: 'waves',
      icon: `
        <path d="M30 62 C24 62 20 57 20 51 C20 45 25 41 30 41 C31 32 38 25 48 25 C56 25 64 31 66 39 C72 39 78 44 78 50 C78 56 73 62 67 62 Z" fill="none" stroke="#FFFFFF" stroke-width="3.5" />
        <path d="M42 54 L50 44 L58 54 M50 44 L50 68" stroke="#E8440F" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />
      `,
    };
  }

  // 9. Videojuegos / Gráficos
  if (t.includes('videojuego') || t.includes('juego') || t.includes('motores') || t.includes('gráficos') || t.includes('graficos')) {
    return {
      tag: 'GAME DEVELOPMENT',
      accentColor: '#E8440F',
      bgGradStart: '#24141A',
      bgGradEnd: '#3C1B28',
      patternType: 'isometric',
      icon: `
        <rect x="22" y="32" width="56" height="36" rx="10" fill="none" stroke="#FFFFFF" stroke-width="3.5" />
        <line x1="34" y1="44" x2="34" y2="56" stroke="#E8440F" stroke-width="3.5" stroke-linecap="round" />
        <line x1="28" y1="50" x2="40" y2="50" stroke="#E8440F" stroke-width="3.5" stroke-linecap="round" />
        <circle cx="62" cy="46" r="3" fill="#FFFFFF" />
        <circle cx="68" cy="54" r="3" fill="#FFFFFF" />
      `,
    };
  }

  // 10. Web / WebAssembly / Frontend / Backend
  if (t.includes('web') || t.includes('webassembly') || t.includes('rust') || t.includes('javascript') || t.includes('fullstack')) {
    return {
      tag: 'WEB ENGINEERING',
      accentColor: '#E8440F',
      bgGradStart: '#1B1713',
      bgGradEnd: '#34261B',
      patternType: 'grid',
      icon: `
        <rect x="20" y="24" width="60" height="52" rx="4" fill="none" stroke="#FFFFFF" stroke-width="3" />
        <line x1="20" y1="36" x2="80" y2="36" stroke="#FFFFFF" stroke-width="2" />
        <path d="M34 46 L27 53 L34 60 M46 60 L41 46 M53 46 L60 53 L53 60" stroke="#E8440F" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
      `,
    };
  }

  // 11. Ética / Innovación / Hackatón General
  if (cat === 'hackatón' || t.includes('innovación') || t.includes('innovacion') || t.includes('abierta')) {
    return {
      tag: 'HACKATHON & INNOVATION',
      accentColor: '#E8440F',
      bgGradStart: '#20130E',
      bgGradEnd: '#3B1F16',
      patternType: 'isometric',
      icon: `
        <path d="M50 18 C38 18 30 27 30 38 C30 46 35 52 38 56 L38 64 L62 64 L62 56 C65 52 70 46 70 38 C70 27 62 18 50 18 Z" fill="none" stroke="#FFFFFF" stroke-width="3" />
        <line x1="42" y1="70" x2="58" y2="70" stroke="#E8440F" stroke-width="3" stroke-linecap="round" />
        <line x1="46" y1="75" x2="54" y2="75" stroke="#E8440F" stroke-width="3" stroke-linecap="round" />
        <path d="M50 30 L50 44 M43 37 L57 37" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" />
      `,
    };
  }

  // 12. Conferencia Magistral / Keynote
  if (cat === 'conferencia' || t.includes('ética') || t.includes('etica') || t.includes('magistral')) {
    return {
      tag: 'KEYNOTE CONFERENCE',
      accentColor: '#16130F',
      bgGradStart: '#141416',
      bgGradEnd: '#28272C',
      patternType: 'waves',
      icon: `
        <rect x="42" y="24" width="16" height="28" rx="8" fill="none" stroke="#FFFFFF" stroke-width="3" />
        <path d="M34 40 C34 50 42 56 50 56 C58 56 66 50 66 40" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" />
        <line x1="50" y1="56" x2="50" y2="72" stroke="#FFFFFF" stroke-width="3" />
        <line x1="38" y1="72" x2="62" y2="72" stroke="#E8440F" stroke-width="4" stroke-linecap="round" />
      `,
    };
  }

  // 13. Encuentro de Comunidades
  if (cat === 'encuentro' || t.includes('comunidades') || t.includes('networking')) {
    return {
      tag: 'COMMUNITY & NETWORKING',
      accentColor: '#B7700B',
      bgGradStart: '#1E1912',
      bgGradEnd: '#332918',
      patternType: 'dots',
      icon: `
        <circle cx="50" cy="34" r="10" fill="none" stroke="#FFFFFF" stroke-width="3" />
        <path d="M32 64 C32 54 40 48 50 48 C60 48 68 54 68 64" fill="none" stroke="#FFFFFF" stroke-width="3" />
        <circle cx="26" cy="38" r="6" fill="none" stroke="#B7700B" stroke-width="2.5" />
        <path d="M14 62 C14 55 19 50 26 50" fill="none" stroke="#B7700B" stroke-width="2.5" />
        <circle cx="74" cy="38" r="6" fill="none" stroke="#B7700B" stroke-width="2.5" />
        <path d="M86 62 C86 55 81 50 74 50" fill="none" stroke="#B7700B" stroke-width="2.5" />
      `,
    };
  }

  // Default Taller
  return {
    tag: 'WORKSHOP & LAB',
    accentColor: '#1E6B4F',
    bgGradStart: '#131F19',
    bgGradEnd: '#243A2F',
    patternType: 'grid',
    icon: `
      <rect x="24" y="24" width="52" height="52" rx="4" fill="none" stroke="#FFFFFF" stroke-width="3" />
      <path d="M34 50 L46 62 L66 38" fill="none" stroke="#E8440F" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
    `,
  };
}

function generatePatternSvg(type: 'grid' | 'dots' | 'isometric' | 'waves', color: string): string {
  if (type === 'dots') {
    return `
      <pattern id="pat-dots" width="16" height="16" patternUnits="userSpaceOnUse">
        <circle cx="8" cy="8" r="1.5" fill="${color}" opacity="0.25" />
      </pattern>
      <rect width="800" height="320" fill="url(#pat-dots)" />
    `;
  }
  if (type === 'isometric') {
    return `
      <pattern id="pat-iso" width="30" height="30" patternUnits="userSpaceOnUse">
        <path d="M0 15 L15 0 L30 15 L15 30 Z" fill="none" stroke="${color}" stroke-width="1" opacity="0.18" />
      </pattern>
      <rect width="800" height="320" fill="url(#pat-iso)" />
    `;
  }
  if (type === 'waves') {
    return `
      <pattern id="pat-waves" width="40" height="20" patternUnits="userSpaceOnUse">
        <path d="M0 10 Q10 0 20 10 T40 10" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.2" />
      </pattern>
      <rect width="800" height="320" fill="url(#pat-waves)" />
    `;
  }
  // grid default
  return `
    <pattern id="pat-grid" width="24" height="24" patternUnits="userSpaceOnUse">
      <path d="M24 0 L0 0 0 24" fill="none" stroke="${color}" stroke-width="1" opacity="0.18" />
    </pattern>
    <rect width="800" height="320" fill="url(#pat-grid)" />
  `;
}

export function getSessionImage(type: string, title?: string, id?: string, description?: string): EventImage {
  const theme = getThemeForEvent(type, title, description);
  const escapedTag = escapeXml(theme.tag);
  const displayTitle = escapeXml((title || type || 'Evento Universitario').replace(/\s+/g, ' ').trim().slice(0, 36));
  const eventSeed = hashEventSeed(`${id || ''}|${type || ''}|${title || ''}`);
  const eventCode = eventSeed.toString(36).toUpperCase().padStart(7, '0').slice(-7);
  const patternOffsetX = eventSeed % 24;
  const patternOffsetY = (eventSeed >>> 5) % 24;
  const artRotation = (eventSeed % 21) - 10;

  // SVG Banner de alta fidelidad, 800x320 px, 100% vectorial, 0ms de carga
  const rawSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 320" width="800" height="320">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${theme.bgGradStart}" />
          <stop offset="100%" stop-color="${theme.bgGradEnd}" />
        </linearGradient>
      </defs>

      <!-- Fondo Degradado Sólido -->
      <rect width="800" height="320" fill="url(#bgGrad)" />

      <!-- Textura de Trama Geométrica -->
      <g transform="translate(${patternOffsetX} ${patternOffsetY})">
        ${generatePatternSvg(theme.patternType, '#FFFFFF')}
      </g>

      <!-- Elemento de Arte Conceptual a la Izquierda -->
      <g transform="translate(60, 110) scale(1.4) rotate(${artRotation} 50 50)">
        <circle cx="50" cy="50" r="44" fill="#16130F" opacity="0.6" stroke="${theme.accentColor}" stroke-width="2" />
        ${theme.icon}
      </g>

      <!-- Borde y Sello Estilo Programa Impreso -->
      <line x1="20" y1="20" x2="780" y2="20" stroke="#DDD7CC" stroke-width="1.5" opacity="0.4" />
      <line x1="20" y1="300" x2="780" y2="300" stroke="#DDD7CC" stroke-width="1.5" opacity="0.4" />
      <line x1="20" y1="20" x2="20" y2="300" stroke="#DDD7CC" stroke-width="1.5" opacity="0.4" />
      <line x1="780" y1="20" x2="780" y2="300" stroke="#DDD7CC" stroke-width="1.5" opacity="0.4" />

      <!-- Tipografía y Etiquetas en el Banner -->
      <text x="240" y="100" font-family="monospace" font-size="14" font-weight="700" fill="${theme.accentColor}" letter-spacing="3">
        ● ${escapedTag}
      </text>

      <text x="240" y="155" font-family="sans-serif, system-ui" font-size="28" font-weight="800" fill="#FFFFFF" letter-spacing="-0.5">
        ${displayTitle}
      </text>

      <text x="240" y="200" font-family="monospace" font-size="13" font-weight="500" fill="#DDD7CC" opacity="0.85">
        PROGRAMA OFICIAL EVENTOVIVO · EN VIVO
      </text>

      <text x="730" y="288" text-anchor="end" font-family="monospace" font-size="10" font-weight="700" fill="#DDD7CC" opacity="0.7">
        EV-${eventCode}
      </text>

      <!-- Acento Bermellón de Señal en Esquina -->
      <polygon points="760,20 780,20 780,40" fill="#E8440F" />
    </svg>
  `.trim();

  // Codificación segura y limpia como Data URL SVG
  const encodedSvg = `data:image/svg+xml;utf8,${encodeURIComponent(rawSvg)}`;

  return {
    url: encodedSvg,
    alt: `${theme.tag} — ${title || type}`,
    accentColor: theme.accentColor,
  };
}
