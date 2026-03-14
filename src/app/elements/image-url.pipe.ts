import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'imageUrl', standalone: true })
export class ImageUrlPipe implements PipeTransform {
  transform(url: string | undefined | null, size: 'full' | 'thumb' = 'full'): string {
    if (!url) return '';
    if (url.endsWith('.webp') || url.endsWith('.jpg') || url.endsWith('.png')) return url;
    return size === 'thumb' ? `${url}_200.webp` : `${url}.webp`;
  }
}
