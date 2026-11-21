import { describe, it, expect } from 'vitest';
import { generateQrSvg } from '@/lib/qrcode';

describe('QR Code SVG Generator', () => {
  it('genera un SVG válido con los elementos requeridos', () => {
    const token = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
    const svg = generateQrSvg(token);

    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('viewBox="0 0 240 240"');
    expect(svg).toContain('<rect');
  });

  it('respeta las dimensiones personalizadas', () => {
    const svg = generateQrSvg('token123', 300);
    expect(svg).toContain('viewBox="0 0 300 300"');
    expect(svg).toContain('width="300"');
  });
});
