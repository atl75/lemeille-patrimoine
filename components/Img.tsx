import Image, { ImageProps } from 'next/image';

/**
 * Wrapper "safe" pour remplacer <img>.
 * - Fournit des width/height par défaut (évite les erreurs TypeScript).
 * - Conserve className/alt/src, accepte priority/placeholder etc.
 */
type Props = Omit<ImageProps, 'width' | 'height'> & {
  width?: number;
  height?: number;
};
export default function Img({ width = 1200, height = 800, alt = '', ...rest }: Props) {
  return <Image width={width} height={height} alt={alt} {...rest} />;
}
