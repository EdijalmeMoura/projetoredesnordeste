export function setPageMeta(title: string, description: string, image?: string) {
  document.title = title;
  const set = (selector: string, attribute: string, value: string) => {
    let element = document.querySelector<HTMLMetaElement>(selector);
    if (!element) {
      element = document.createElement('meta');
      const [key, content] = selector.match(/\[(name|property)="([^"]+)"\]/)?.slice(1) || [];
      if (key && content) element.setAttribute(key, content);
      document.head.append(element);
    }
    element.setAttribute(attribute, value);
  };
  set('meta[name="description"]', 'content', description);
  set('meta[property="og:title"]', 'content', title);
  set('meta[property="og:description"]', 'content', description);
  if (image) set('meta[property="og:image"]', 'content', image.startsWith('http') ? image : `${window.location.origin}${image}`);
}
