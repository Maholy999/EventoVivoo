import { describe, expect, it } from 'vitest';
import { getSessionImage } from '../eventImages';

function decodeSvg(dataUrl: string): string {
  const prefix = 'data:image/svg+xml;utf8,';
  expect(dataUrl.startsWith(prefix)).toBe(true);
  return decodeURIComponent(dataUrl.slice(prefix.length));
}

describe('generador de imágenes de eventos', () => {
  it('escapa títulos especiales para mantener SVG válido', () => {
    const image = getSessionImage('taller', 'Diseño <UX> & datos');
    const svg = decodeSvg(image.url);

    expect(svg).toContain('Diseño &lt;UX&gt; &amp; datos');
    expect(svg).not.toContain('Diseño <UX>');
  });

  it('genera una imagen distinta para eventos diferentes aunque tengan la misma categoría', () => {
    const first = getSessionImage('taller', 'Taller Web', 'session-1');
    const second = getSessionImage('taller', 'Taller Web', 'session-2');

    expect(first.url).not.toBe(second.url);
    expect(decodeSvg(first.url)).toContain('EV-');
    expect(decodeSvg(second.url)).toContain('EV-');
  });

  it('es estable para el mismo evento', () => {
    const first = getSessionImage('conferencia', 'IA y Ética', 'session-9');
    const second = getSessionImage('conferencia', 'IA y Ética', 'session-9');

    expect(first.url).toBe(second.url);
  });

  it('usa una ilustración relacionada con Web3 y no la de IA', () => {
    const image = getSessionImage(
      'hackatón',
      'Hackatón Web3: Contratos Inteligentes y DeFi',
      'session-1',
      'Aplicaciones descentralizadas en Ethereum y Polygon'
    );

    expect(image.alt).toContain('WEB3 & BLOCKCHAIN');
    expect(decodeSvg(image.url)).toContain('WEB3 &amp; BLOCKCHAIN');
    expect(decodeSvg(image.url)).not.toContain('WEB3 & BLOCKCHAIN');
  });

  it('diferencia el tema de agentes inteligentes del tema de ética', () => {
    const agents = getSessionImage('taller', 'Taller Avanzado de Agentes Inteligentes y LLMs', 'session-2');
    const ethics = getSessionImage('conferencia', 'Ética en Modelos de Lenguaje Masivos', 'session-9');

    expect(agents.alt).toContain('AGENTIC AI & LLMS');
    expect(ethics.alt).toContain('AI ETHICS & GOVERNANCE');
  });
});
