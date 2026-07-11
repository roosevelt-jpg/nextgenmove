import Link from "next/link";
import type { OriginCity, PageHomeDocument } from "@/types/cms";
import styles from "./animated-globe-hero.module.css";

const HUB = { x: 250, y: 250 } as const;
const VIEW = 500;

/** Fallback layout matching NextGenMove_Homepage_Animated_Globe.html */
const DEFAULT_CITIES: OriginCity[] = [
  { code: "AMS", label: "Amsterdam", initials: "SK", x: 80, y: 140, avatarX: 80, avatarY: 105 },
  { code: "BER", label: "Berlin", initials: "JL", x: 70, y: 250, avatarX: 55, avatarY: 250 },
  { code: "CAI", label: "Cairo", initials: "AM", x: 90, y: 360, avatarX: 78, avatarY: 398 },
  { code: "WAW", label: "Warsaw", initials: "PV", x: 420, y: 120, avatarX: 430, avatarY: 85 },
  { code: "PAR", label: "Paris", initials: "LB", x: 440, y: 260, avatarX: 465, avatarY: 260 },
  { code: "LIS", label: "Lisbon", initials: "CN", x: 410, y: 380, avatarX: 425, avatarY: 405 },
];

export interface AnimatedGlobeHeroProps {
  content: PageHomeDocument | null;
}

function initialsFromLabel(label: string, code: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  if (parts[0] && parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (code || "NG").slice(0, 2).toUpperCase();
}

function avatarPosition(city: OriginCity): { ax: number; ay: number } {
  if (typeof city.avatarX === "number" && typeof city.avatarY === "number") {
    return { ax: city.avatarX, ay: city.avatarY };
  }
  const left = city.x < HUB.x;
  const top = city.y < HUB.y - 40;
  const bottom = city.y > HUB.y + 40;
  if (top) return { ax: city.x + (left ? -5 : 10), ay: city.y - 35 };
  if (bottom) return { ax: city.x + (left ? -12 : 15), ay: city.y + 38 };
  return { ax: city.x + (left ? -15 : 25), ay: city.y };
}

function routePath(city: OriginCity): string {
  const qx = city.x * 0.45 + HUB.x * 0.55;
  const qy = city.y * 0.4 + HUB.y * 0.6;
  return `M ${city.x},${city.y} Q ${qx},${qy} ${HUB.x},${HUB.y}`;
}

function resolveCities(content: PageHomeDocument | null): OriginCity[] {
  const hub = (content?.hubLabel ?? "DXB").toUpperCase();
  const raw = (content?.originCities ?? []).filter(
    (c) => c.code && c.code.toUpperCase() !== hub,
  );

  if (!raw.length) return DEFAULT_CITIES;

  return raw.map((city, i) => {
    const byCode = DEFAULT_CITIES.find((d) => d.code === city.code);
    const byIndex = DEFAULT_CITIES[i % DEFAULT_CITIES.length]!;
    const layout = byCode ?? byIndex;
    const useDefaultLayout = typeof city.avatarX !== "number";

    return {
      ...city,
      initials:
        city.initials?.trim() ||
        layout.initials ||
        initialsFromLabel(city.label || "", city.code || ""),
      x: useDefaultLayout ? layout.x : city.x,
      y: useDefaultLayout ? layout.y : city.y,
      avatarX: city.avatarX ?? layout.avatarX,
      avatarY: city.avatarY ?? layout.avatarY,
    };
  });
}

export function AnimatedGlobeHero({ content }: AnimatedGlobeHeroProps) {
  const cities = resolveCities(content);
  const hubLabel = content?.hubLabel ?? "DXB";
  const routeCodes = [
    ...cities.map((c) => c.code).filter(Boolean),
    hubLabel,
  ];

  return (
    <section className={styles.heroBand}>
      <div className={styles.heroInner}>
        <div className={styles.heroCopy}>
          {content?.eyebrowText ? (
            <p className={styles.eyebrow}>{content.eyebrowText}</p>
          ) : null}
          {content?.headline || content?.headlineEmphasis ? (
            <h1 className={styles.headline}>
              {content?.headline}
              {content?.headlineEmphasis ? (
                <em className={styles.headlineEmphasis}>
                  {content.headlineEmphasis}
                </em>
              ) : null}
            </h1>
          ) : null}
          {content?.subtext ? (
            <p className={styles.subtext}>{content.subtext}</p>
          ) : null}
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

          {content?.boardingPass?.routeLabel ||
          content?.boardingPass?.passengerValue ? (
            <div className={styles.boardingPass} aria-label="Boarding pass">
              {content.boardingPass.routeLabel ? (
                <p className={styles.boardingRoute}>
                  {content.boardingPass.routeLabel}
                </p>
              ) : null}
              <dl className={styles.boardingGrid}>
                {content.boardingPass.passengerLabel &&
                content.boardingPass.passengerValue ? (
                  <div>
                    <dt>{content.boardingPass.passengerLabel}</dt>
                    <dd>{content.boardingPass.passengerValue}</dd>
                  </div>
                ) : null}
                {content.boardingPass.coachLabel &&
                content.boardingPass.coachValue ? (
                  <div>
                    <dt>{content.boardingPass.coachLabel}</dt>
                    <dd>{content.boardingPass.coachValue}</dd>
                  </div>
                ) : null}
                {content.boardingPass.statusLabel &&
                content.boardingPass.statusValue ? (
                  <div>
                    <dt>{content.boardingPass.statusLabel}</dt>
                    <dd>{content.boardingPass.statusValue}</dd>
                  </div>
                ) : null}
                {content.boardingPass.classLabel &&
                content.boardingPass.classValue ? (
                  <div>
                    <dt>{content.boardingPass.classLabel}</dt>
                    <dd>{content.boardingPass.classValue}</dd>
                  </div>
                ) : null}
                {content.boardingPass.refLabel &&
                content.boardingPass.refValue ? (
                  <div>
                    <dt>{content.boardingPass.refLabel}</dt>
                    <dd>{content.boardingPass.refValue}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
          ) : null}
        </div>

        <div className={styles.globeWrap} aria-hidden>
          <svg
            className={styles.globeSvg}
            viewBox={`0 0 ${VIEW} ${VIEW}`}
            role="presentation"
          >
            <g className={styles.globeSpin}>
              <circle className={styles.globeOutline} cx={HUB.x} cy={HUB.y} r={190} />
              <ellipse className={styles.graticule} cx={HUB.x} cy={HUB.y} rx={190} ry={70} />
              <ellipse className={styles.graticule} cx={HUB.x} cy={HUB.y} rx={190} ry={130} />
              <ellipse className={styles.graticule} cx={HUB.x} cy={HUB.y} rx={70} ry={190} />
              <ellipse className={styles.graticule} cx={HUB.x} cy={HUB.y} rx={130} ry={190} />
            </g>

            {cities.map((city, i) => {
              const id = `route-${city.code || i}`;
              const d = routePath(city);
              const delay = `${(-0.4 * i).toFixed(1)}s`;
              const travelDur = `${(2.2 + (i % 5) * 0.1).toFixed(1)}s`;
              const travelBegin = `${(i * 0.25).toFixed(1)}s`;
              return (
                <g key={id}>
                  <path
                    id={id}
                    className={styles.routeArc}
                    d={d}
                    style={{ animationDelay: delay }}
                  />
                  <circle className={styles.traveler} r={3}>
                    <animateMotion
                      dur={travelDur}
                      repeatCount="indefinite"
                      begin={travelBegin}
                      rotate="auto"
                    >
                      <mpath href={`#${id}`} />
                    </animateMotion>
                  </circle>
                </g>
              );
            })}

            <circle className={styles.hubRing} cx={HUB.x} cy={HUB.y} r={8} />
            <circle
              className={styles.hubRing}
              cx={HUB.x}
              cy={HUB.y}
              r={8}
              style={{ animationDelay: "-1.1s" }}
            />
            <circle className={styles.hubDot} cx={HUB.x} cy={HUB.y} r={6} />
            <text className={styles.dxbLabel} x={HUB.x} y={HUB.y + 28}>
              {hubLabel}
            </text>

            {cities.map((city, i) => {
              const { ax, ay } = avatarPosition(city);
              const initials =
                city.initials?.trim() ||
                initialsFromLabel(city.label || "", city.code || "");
              const bobDelay = `${(-1.2 * (i % 5)).toFixed(1)}s`;
              return (
                <g key={`city-${city.code || i}`}>
                  <circle
                    className={styles.cityDot}
                    cx={city.x}
                    cy={city.y}
                    r={3.5}
                  />
                  <g
                    className={styles.avatarBubble}
                    style={{ animationDelay: bobDelay }}
                  >
                    <circle className={styles.avatarCircle} cx={ax} cy={ay} r={17} />
                    <text className={styles.avatarText} x={ax} y={ay + 1}>
                      {initials}
                    </text>
                    {city.label ? (
                      <text className={styles.avatarLabel} x={ax} y={ay + 27}>
                        {city.label.toUpperCase()}
                      </text>
                    ) : null}
                  </g>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {content?.currentRoutesLabel || routeCodes.length ? (
        <div className={styles.routeBar}>
          <div className={styles.routeBarInner}>
            {content?.currentRoutesLabel ? (
              <span className={styles.routeBarLabel}>
                {content.currentRoutesLabel}
              </span>
            ) : null}
            {routeCodes.length ? (
              <span className={styles.routeBarCodes}>
                {routeCodes.join(" · ")}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
