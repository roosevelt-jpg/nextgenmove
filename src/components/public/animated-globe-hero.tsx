import Link from "next/link";
import type { OriginCity, PageHomeDocument } from "@/types/cms";
import styles from "./animated-globe-hero.module.css";

export interface AnimatedGlobeHeroProps {
  content: PageHomeDocument | null;
}

const HUB = { x: 250, y: 250 };

function buildRoutePath(city: OriginCity, index: number): string {
  const controlX = (city.x + HUB.x) / 2;
  const controlY = (city.y + HUB.y) / 2 - (index % 2 === 0 ? 20 : -20);
  return `M ${city.x},${city.y} Q ${controlX},${controlY} ${HUB.x},${HUB.y}`;
}

export function AnimatedGlobeHero({ content }: AnimatedGlobeHeroProps) {
  const cities = content?.originCities ?? [];

  return (
    <section className={styles.hero}>
      <div className={styles.heroLeft}>
        {content?.eyebrowText ? (
          <p className={styles.eyebrow}>{content.eyebrowText}</p>
        ) : null}
        {content?.headline || content?.headlineEmphasis ? (
          <h1 className={styles.headline}>
            {content?.headline}
            {content?.headlineEmphasis ? (
              <em className={styles.headlineEmphasis}>{content.headlineEmphasis}</em>
            ) : null}
          </h1>
        ) : null}
        {content?.subtext ? <p className={styles.subtext}>{content.subtext}</p> : null}
        <div className={styles.ctas}>
          {content?.ctaPrimaryLabel && content?.ctaPrimaryHref ? (
            <Link href={content.ctaPrimaryHref} className={styles.btnPrimary}>
              {content.ctaPrimaryLabel}
            </Link>
          ) : null}
          {content?.ctaSecondaryLabel && content?.ctaSecondaryHref ? (
            <Link href={content.ctaSecondaryHref} className={styles.btnGhost}>
              {content.ctaSecondaryLabel}
            </Link>
          ) : null}
        </div>
      </div>

      <div className={styles.globeWrap}>
        <svg viewBox="0 0 500 500" width="100%" height="480" aria-hidden="true">
          <g className={styles.globeSlowspin}>
            <circle className={styles.globeOutline} cx="250" cy="250" r="190" />
            <ellipse className={styles.graticule} cx="250" cy="250" rx="190" ry="70" />
            <ellipse className={styles.graticule} cx="250" cy="250" rx="190" ry="130" />
            <ellipse className={styles.graticule} cx="250" cy="250" rx="70" ry="190" />
            <ellipse className={styles.graticule} cx="250" cy="250" rx="130" ry="190" />
          </g>

          {cities.map((city, index) => {
            const pathId = `route-${index}`;
            const path = buildRoutePath(city, index);

            return (
              <g key={`${city.code}-${city.label}`}>
                <path
                  id={pathId}
                  className={styles.routeArc}
                  d={path}
                  style={{ animationDelay: `${-0.4 * index}s` }}
                />
                <circle className={styles.traveler} r="3">
                  <animateMotion
                    dur={`${2.2 + (index % 3) * 0.2}s`}
                    repeatCount="indefinite"
                    begin={`${index * 0.2}s`}
                    rotate="auto"
                  >
                    <mpath href={`#${pathId}`} />
                  </animateMotion>
                </circle>
                <circle className={styles.cityDot} cx={city.x} cy={city.y} r="3.5" />
                <g className={styles.avatarBubble} style={{ animationDelay: `${-0.6 * index}s` }}>
                  <circle className={styles.avatarCircle} cx={city.x} cy={city.y - 35} r="17" />
                  <text className={styles.avatarText} x={city.x} y={city.y - 34}>
                    {city.code}
                  </text>
                  <text className={styles.avatarLabel} x={city.x} y={city.y - 8}>
                    {city.label}
                  </text>
                </g>
              </g>
            );
          })}

          <circle className={styles.hubRing} cx="250" cy="250" r="8" />
          <circle
            className={styles.hubRing}
            cx="250"
            cy="250"
            r="8"
            style={{ animationDelay: "-1.1s" }}
          />
          <circle className={styles.hubDot} cx="250" cy="250" r="6" />
          {content?.hubLabel ? (
            <text className={styles.dxbLabel} x="250" y="278">
              {content.hubLabel}
            </text>
          ) : null}
        </svg>
      </div>
    </section>
  );
}
