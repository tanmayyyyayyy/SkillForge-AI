import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Fragment } from 'react';
import { renderChatMarkdown, renderInline } from './chatMarkdown.js';

/**
 * Unit tests for the dependency-free chat markdown renderer. Rendered output
 * is asserted through react-dom/server so no DOM environment is required.
 */

function html(markdown: string): string {
  return renderToStaticMarkup(<Fragment>{renderChatMarkdown(markdown)}</Fragment>);
}

describe('renderChatMarkdown', () => {
  it('renders ATX headings at the mapped levels', () => {
    expect(html('# Big title')).toContain('<h3');
    expect(html('## Medium')).toContain('<h4');
    expect(html('### Coach section')).toContain('<h5');
    expect(html('#### Fine detail')).toContain('<h6');
    expect(html('### Coach section')).toContain('Coach section');
  });

  it('renders bold, italic, and inline code', () => {
    const out = html('Use **Python** with `pip` and *practice* daily.');
    expect(out).toContain('<strong>Python</strong>');
    expect(out).toContain('<code>pip</code>');
    expect(out).toContain('<em>practice</em>');
  });

  it('renders unordered lists with one nesting level', () => {
    const out = html('- **Phase 1:** theory\n  - Focus: PyTorch\n  - Activity: drills\n- **Phase 2:** project');
    expect(out).toContain('<ul');
    expect(out).toContain('<li');
    expect(out).toContain('<strong>Phase 1:</strong>');
    expect(out).toContain('Focus: PyTorch');
    // The nested items live inside a nested <ul>.
    expect(out.indexOf('<ul')).toBeLessThan(out.indexOf('Focus: PyTorch'));
  });

  it('renders ordered lists', () => {
    const out = html('1. **Why it matters:** it is core\n2. **Immediate Focus:** 8 hours');
    expect(out).toContain('<ol');
    expect(out).toContain('Why it matters:');
  });

  it('renders blockquotes', () => {
    const out = html('> Completing this project awards a bonus!');
    expect(out).toContain('<blockquote');
    expect(out).toContain('awards a bonus!');
  });

  it('renders plain lines as paragraphs and preserves blank-line separation', () => {
    const out = html('First line.\n\nSecond paragraph.');
    expect(out).toContain('<p');
    expect(out).toContain('First line.');
    expect(out).toContain('Second paragraph.');
  });

  it('renders a realistic coach reply with mixed structure', () => {
    const out = html(
      '### Weekly Study Plan (14 Hours Available)\n\n- **Phase 1:** theory\n- **Phase 2:** build\n\n*Consistency beats cramming.*'
    );
    expect(out).toContain('Weekly Study Plan');
    expect(out).toContain('<ul');
    expect(out).toContain('<em>Consistency beats cramming.</em>');
  });

  it('escapes raw HTML in model output instead of injecting it', () => {
    const out = html('<img src=x onerror=alert(1)> and **<script>alert(2)</script>**');
    expect(out).not.toContain('<img');
    expect(out).not.toContain('<script');
    expect(out).toContain('&lt;img');
    expect(out).toContain('<strong>&lt;script&gt;alert(2)&lt;/script&gt;</strong>');
  });

  it('handles CRLF line endings', () => {
    const out = html('### Header\r\n- item one');
    expect(out).toContain('Header');
    expect(out).toContain('item one');
  });
});

describe('renderInline', () => {
  it('splits mixed inline formatting into elements', () => {
    const out = renderToStaticMarkup(<Fragment>{renderInline('a **b** `c` *d*', 'k')}</Fragment>);
    expect(out).toBe('a <strong>b</strong> <code>c</code> <em>d</em>');
  });

  it('leaves plain text untouched', () => {
    const out = renderToStaticMarkup(<Fragment>{renderInline('plain text', 'k')}</Fragment>);
    expect(out).toBe('plain text');
  });
});
