import { IntermediateForm, Unpacked } from '../types';
import { map, pipe, join } from '../helpers';

const renderToHtml = () => (x: IntermediateForm) => {
  const mapInline = (y: {
    text: string;
    attributes: Array<{ type: string; meta?: any }>;
  }): string => {
    if (!y.attributes.length) {
      console.log('return text', y);
      return y.text;
    }

    const spec: { [k: string]: any } = {
      tag: 'span',
      props: { style: '' },
      children: y.text,
    };

    y.attributes.forEach((z) => {
      if (z.type === 'i') spec.props.style += 'font-style:italic;';
      if (z.type === 'b') spec.props.style += 'font-weight:bold;';
      if (z.type === 'a') {
        spec.tag = 'a';
        spec.props.href = z.meta;
      }
    });

    const attrString = Object.entries(spec.props)
      .reduce((str, [k, v]) => {
        return v ? str + `${k}="${v}"` + ' ' : ''; // The space is separate just to make it more obvious
      }, '')
      .trim();

    return `<${spec.tag} ${attrString}>${spec.children}</${spec.tag}>`;
  };

  const buildInline = pipe(map(mapInline), join(''));

  const buildHtml = (child: Unpacked<typeof x['content']>) => {
    switch (child.type) {
      case 'header':
        return `<h1>${buildInline(child.children)}</h1>`;
      case 'text':
        return `<p>${buildInline(child.children)}</p>`;
      case 'code':
        // @ts-ignore
        return `<pre>${buildInline(child.children)}</pre>`;
      case 'newline':
        return ``;
      case 'image':
        const alt = child.captionString || '';
        const figcaption = child.caption ? buildInline(child.caption) : '';
        return !alt
          ? `<img src="${child.src}" />`
          : join('')([
              `<figure>`,
              `<img src="${child.src}" alt="${alt}"/>`,
              `<figcaption>${figcaption}</figcaption>`,
              `</figure>`,
            ]);
      default:
        return child.type;
    }
  };

  const html = x.content.map(buildHtml).join('\n');

  return html;
};

export default renderToHtml;
