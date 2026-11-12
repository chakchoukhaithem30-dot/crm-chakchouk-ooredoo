const React = window.React;

export function Icon({ name, size = 18, strokeWidth = 2, className = '' }) {
  const iconDef = window.lucide?.icons?.[name] || window.lucide?.[name];
  if (!iconDef || !Array.isArray(iconDef)) {
    return null;
  }

  // Format Lucide UMD: ["svg", baseAttrs, children] ou directement tableau d'enfants
  let baseAttrs = {
    xmlns: 'http://www.w3.org/2000/svg',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };
  let children = [];

  if (iconDef[0] === 'svg') {
    const rawAttrs = iconDef[1] || {};
    baseAttrs = {
      ...baseAttrs,
      viewBox: rawAttrs.viewBox || '0 0 24 24',
      fill: rawAttrs.fill || 'none',
      stroke: rawAttrs.stroke || 'currentColor',
      strokeLinecap: rawAttrs['stroke-linecap'] || 'round',
      strokeLinejoin: rawAttrs['stroke-linejoin'] || 'round',
    };
    children = iconDef[2] || [];
  } else {
    children = iconDef;
  }

  return React.createElement(
    'svg',
    {
      ...baseAttrs,
      width: size,
      height: size,
      strokeWidth,
      className: `shrink-0 ${className}`.trim(),
      'aria-hidden': 'true',
    },
    children.map(([tag, attrs], idx) => {
      const reactAttrs = { key: idx };
      for (const [k, v] of Object.entries(attrs || {})) {
        const camelKey = k.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        reactAttrs[camelKey] = v;
      }
      return React.createElement(tag, reactAttrs);
    })
  );
}

