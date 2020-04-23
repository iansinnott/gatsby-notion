import { IntermediateForm, Unpacked } from '../types';
import { map, pipe, join } from '../helpers';
import { htmlEscape } from 'escape-goat';

const renderToHtml = () => (x: IntermediateForm) => {
  const mapInline = (
    y:
      | {
          type: string;
          children: string;
          props: { attributes: Array<{ type: string; meta?: any }> };
        }
      | string,
  ): string => {
    if (typeof y === 'string') {
      return htmlEscape(y);
    }
    if (!y.props.attributes.length) {
      console.log('return text', y);
      return htmlEscape(y.children);
    }

    const spec: { [k: string]: any } = {
      tag: 'span',
      props: { style: '', class: [] },
      children: y.children,
    };

    y.props.attributes.forEach((z) => {
      if (z.type === 'i') spec.props.class.push('italic');
      if (z.type === 'b') spec.props.class.push('bold');
      if (z.type === 'a') {
        spec.tag = 'a';
        spec.props.href = z.meta;
      }
      if (z.type === 'c') {
        spec.tag = 'code';
      }
    });

    const attrString = Object.entries(spec.props)
      .reduce((str, [k, v]) => {
        const value = Array.isArray(v) ? v.join(' ') : v;
        return value ? str + `${k}="${value}"` + ' ' : ''; // The space is separate just to make it more obvious
      }, '')
      .trim();

    return `<${spec.tag} ${attrString}>${htmlEscape(spec.children)}</${
      spec.tag
    }>`;
  };

  const buildInline = pipe(map(mapInline), join(''));

  const buildHtml = (child: Unpacked<typeof x['content']>) => {
    switch (child.type) {
      case 'inline':
        // @ts-ignore
        return buildInline([child]);
      case 'header':
        return `<h1>${buildInline(child.children)}</h1>`;
      case 'sub_header':
        return `<h2>${buildInline(child.children)}</h2>`;
      case 'sub_sub_header':
        return `<h3>${buildInline(child.children)}</h3>`;
      case 'text':
        return `<p>${buildInline(child.children)}</p>`;
      case 'code':
        // @ts-ignore
        return `<pre>${buildInline(child.children)}</pre>`;
      case 'newline':
        return ``;
      case 'quote':
        return `<blockquote>${buildInline(child.children)}</blockquote>`;
      case 'bulleted_list':
        return `<ul><li>${child.children.map(buildHtml).join('')}</li></ul>`;
      case 'numbered_list':
        return `<ol><li>${child.children.map(buildHtml).join('')}</li></ol>`;
      case 'divider':
        return `<hr />`; // Any need for children here?
      case 'toggle':
      case 'callout':
        debugger;
        return `<div class="${child.type}">${child.children
          .map(buildHtml)
          .join('')}</div>`;
      case 'to_do':
        return `<div class="${
          child.type
        }"><span class="checkbox"></span>${buildInline(child.children)}</div>`;
      case 'image':
        const alt = child.props.captionString || '';
        const figcaption = child.props.caption
          ? buildInline(child.props.caption)
          : '';
        return !alt
          ? `<img src="${child.props.src}" />`
          : join('')([
              `<figure>`,
              `<img src="${child.props.src}" alt="${alt}"/>`,
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
