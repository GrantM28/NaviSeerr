type CardArtProps = {
  src?: string;
  alt: string;
};

/* eslint-disable @next/next/no-img-element */
export function CardArt({ src, alt }: CardArtProps) {
  if (!src) {
    return <div aria-hidden="true" className="card-art placeholder" />;
  }

  return <img alt={alt} className="card-art" loading="lazy" src={src} />;
}
