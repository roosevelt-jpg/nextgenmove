import Link from "next/link";
import type { OriginCity, PageHomeDocument } from "@/types/cms";
import { RoutesMarqueeBar } from "@/components/public/routes-marquee";
import styles from "./animated-globe-hero.module.css";

const HUB = { x: 250, y: 250 } as const;
const VIEW = 500;

/** Geometric layout slots only — positions from CMS when set. */
const LAYOUT_SLOTS: Array<Pick<OriginCity, "x" | "y" | "avatarX" | "avatarY">> = [
  { x: 78, y: 128, avatarX: 72, avatarY: 88 },
  { x: 58, y: 250, avatarX: 42, avatarY: 250 },
  { x: 88, y: 372, avatarX: 72, avatarY: 412 },
  { x: 422, y: 112, avatarX: 438, avatarY: 72 },
  { x: 448, y: 250, avatarX: 468, avatarY: 250 },
  { x: 418, y: 378, avatarX: 436, avatarY: 418 },
];

const DEFAULT_PRIMARY_HREF = "/careers-talent";
const DEFAULT_SECONDARY_HREF = "/request-talent";

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
  return (code || "").slice(0, 2).toUpperCase();
}

function avatarPosition(city: OriginCity): { ax: number; ay: number } {
  if (typeof city.avatarX === "number" && typeof city.avatarY === "number") {
    return { ax: city.avatarX, ay: city.avatarY };
  }
  const left = city.x < HUB.x;
  const top = city.y < HUB.y - 40;
  const bottom = city.y > HUB.y + 40;
  if (top) return { ax: city.x + (left ? -5 : 10), ay: city.y - 42 };
  if (bottom) return { ax: city.x + (left ? -12 : 15), ay: city.y + 44 };
  return { ax: city.x + (left ? -22 : 28), ay: city.y };
}

function routePath(city: OriginCity): string {
  const qx = city.x * 0.42 + HUB.x * 0.58;
  const qy = Math.min(city.y, HUB.y) - 55 + Math.abs(city.x - HUB.x) * 0.08;
  return `M ${city.x},${city.y} Q ${qx},${qy} ${HUB.x},${HUB.y}`;
}

function resolveCities(content: PageHomeDocument | null): OriginCity[] {
  const hub = (content?.hubLabel ?? "").toUpperCase();
  const raw = (content?.originCities ?? []).filter(
    (c) => c.code && (!hub || c.code.toUpperCase() !== hub),
  );

  if (!raw.length) return [];

  return raw.map((city, i) => {
    const layout = LAYOUT_SLOTS[i % LAYOUT_SLOTS.length]!;
    const hasCoords = typeof city.x === "number" && typeof city.y === "number";

    return {
      ...city,
      initials:
        city.initials?.trim() ||
        initialsFromLabel(city.label || "", city.code || ""),
      x: hasCoords ? city.x : layout.x,
      y: hasCoords ? city.y : layout.y,
      avatarX: city.avatarX ?? layout.avatarX,
      avatarY: city.avatarY ?? layout.avatarY,
    };
  });
}

/** Simple geometric traveler silhouette (not a stock photo). */
function StudentMark({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x - 9}, ${y - 18})`} className={styles.studentMark}>
      <circle cx="9" cy="5.5" r="4.2" className={styles.studentHead} />
      <path
        className={styles.studentBody}
        d="M2.5 22.5c0-5.2 2.9-8.5 6.5-8.5s6.5 3.3 6.5 8.5"
      />
      <path
        className={styles.studentBag}
        d="M5.2 14.2h7.6c.9 0 1.5.7 1.3 1.5l-1.1 4.2H5l-1.1-4.2c-.2-.8.4-1.5 1.3-1.5z"
      />
    </g>
  );
}

function PlaneIcon() {
  return (
    <g className={styles.planeIcon}>
      <path
        d="M-10 0 L8 -3.2 L14 0 L8 3.2 Z M-2 -1.2 L4 -7.5 L6.2 -6.8 L1.5 -1.1 M-2 1.2 L4 7.5 L6.2 6.8 L1.5 1.1 M-7.5 0 L-4.2 -4.8 L-2.4 -4.2 L-4.8 0 L-2.4 4.2 L-4.2 4.8 Z"
        fill="currentColor"
      />
    </g>
  );
}

function InternshipHubIcon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`} className={styles.hubIcon}>
      <rect x="-11" y="-7" width="22" height="16" rx="2.5" className={styles.hubBuilding} />
      <rect x="-7" y="-3" width="3.2" height="3.2" className={styles.hubWindow} />
      <rect x="-1.6" y="-3" width="3.2" height="3.2" className={styles.hubWindow} />
      <rect x="3.8" y="-3" width="3.2" height="3.2" className={styles.hubWindow} />
      <rect x="-3" y="2" width="6" height="7" className={styles.hubDoor} />
    </g>
  );
}

export function AnimatedGlobeHero({ content }: AnimatedGlobeHeroProps) {
  const cities = resolveCities(content);
  const hubLabel = content?.hubLabel?.trim() || "";
  const routeCodes = [
    ...cities.map((c) => c.code).filter(Boolean),
    ...(hubLabel ? [hubLabel] : []),
  ];

  const primaryHref =
    content?.ctaPrimaryHref?.trim() || DEFAULT_PRIMARY_HREF;
  const secondaryHref =
    content?.ctaSecondaryHref?.trim() || DEFAULT_SECONDARY_HREF;

  const hubCaption = content?.hubCaption?.trim() || "";
  const storyEyebrow = content?.globeStoryEyebrow?.trim() || "";
  const storyTitle = content?.globeStoryTitle?.trim() || "";
  const storyBody = content?.globeStoryBody?.trim() || "";
  const chipStudent = content?.globeStoryChipStudent?.trim() || "";
  const chipFlight = content?.globeStoryChipFlight?.trim() || "";
  const chipInternship = content?.globeStoryChipInternship?.trim() || "";
  const showStoryCard = Boolean(
    storyEyebrow || storyTitle || storyBody || chipStudent || chipFlight || chipInternship,
  );

  return (
    <section className={styles.heroBand}>
      <div className={styles.skyLayer} aria-hidden>
        <span className={`${styles.cloud} ${styles.cloudA}`} />
        <span className={`${styles.cloud} ${styles.cloudB}`} />
        <span className={`${styles.cloud} ${styles.cloudC}`} />
      </div>

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
            {content?.ctaPrimaryLabel ? (
              <Link href={primaryHref} className={styles.btnPrimary}>
                {content.ctaPrimaryLabel}
              </Link>
            ) : null}
            {content?.ctaSecondaryLabel ? (
              <Link href={secondaryHref} className={styles.btnGhost}>
                {content.ctaSecondaryLabel}
              </Link>
            ) : null}
          </div>

          {content?.boardingPass?.routeLabel ||
          content?.boardingPass?.passengerValue ? (
            <div className={styles.boardingPass}>
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
          <div className={styles.globeGlow} />
          <svg
            className={styles.globeSvg}
            viewBox={`0 0 ${VIEW} ${VIEW}`}
            role="presentation"
          >
            <defs>
              <radialGradient id="hubGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(255,253,248,0.35)" />
                <stop offset="55%" stopColor="rgba(201,122,46,0.12)" />
                <stop offset="100%" stopColor="rgba(255,253,248,0)" />
              </radialGradient>
              <filter id="softGlow" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="2.2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Sky airplanes (background flybys) */}
            <g className={styles.skyPlaneA}>
              <g transform="translate(70,55) scale(0.85)" style={{ color: "rgba(255,253,248,0.55)" }}>
                <PlaneIcon />
              </g>
            </g>
            <g className={styles.skyPlaneB}>
              <g transform="translate(390,78) scale(0.7)" style={{ color: "rgba(255,253,248,0.4)" }}>
                <PlaneIcon />
              </g>
            </g>

            <circle cx={HUB.x} cy={HUB.y} r={210} fill="url(#hubGlow)" />

            <g className={styles.globeSpin}>
              <circle className={styles.globeOutline} cx={HUB.x} cy={HUB.y} r={198} />
              <ellipse className={styles.graticule} cx={HUB.x} cy={HUB.y} rx={198} ry={72} />
              <ellipse className={styles.graticule} cx={HUB.x} cy={HUB.y} rx={198} ry={132} />
              <ellipse className={styles.graticule} cx={HUB.x} cy={HUB.y} rx={72} ry={198} />
              <ellipse className={styles.graticule} cx={HUB.x} cy={HUB.y} rx={132} ry={198} />
              <ellipse className={styles.graticuleSoft} cx={HUB.x} cy={HUB.y} rx={198} ry={198} />
            </g>

            {cities.map((city, i) => {
              const id = `route-${city.code || i}`;
              const d = routePath(city);
              const delay = `${(-0.45 * i).toFixed(1)}s`;
              const travelDur = `${(3.2 + (i % 5) * 0.35).toFixed(1)}s`;
              const travelBegin = `${(i * 0.45).toFixed(1)}s`;
              return (
                <g key={id}>
                  <path
                    id={id}
                    className={styles.routeArc}
                    d={d}
                    style={{ animationDelay: delay }}
                    filter="url(#softGlow)"
                  />
                  <g className={styles.routePlane}>
                    <animateMotion
                      dur={travelDur}
                      repeatCount="indefinite"
                      begin={travelBegin}
                      rotate="auto"
                    >
                      <mpath href={`#${id}`} />
                    </animateMotion>
                    <g transform="scale(0.92)" style={{ color: "#FFFDF8" }}>
                      <PlaneIcon />
                    </g>
                  </g>
                  <circle className={styles.traveler} r={2.4}>
                    <animateMotion
                      dur={travelDur}
                      repeatCount="indefinite"
                      begin={`${(i * 0.45 + 1.1).toFixed(1)}s`}
                    >
                      <mpath href={`#${id}`} />
                    </animateMotion>
                  </circle>
                </g>
              );
            })}

            {hubLabel ? (
              <>
                <circle className={styles.hubRing} cx={HUB.x} cy={HUB.y} r={10} />
                <circle
                  className={styles.hubRing}
                  cx={HUB.x}
                  cy={HUB.y}
                  r={10}
                  style={{ animationDelay: "-1.1s" }}
                />
                <circle className={styles.hubDot} cx={HUB.x} cy={HUB.y} r={8} />
                <InternshipHubIcon x={HUB.x} y={HUB.y - 28} />
                <text className={styles.dxbLabel} x={HUB.x} y={HUB.y + 36}>
                  {hubLabel}
                </text>
                {hubCaption ? (
                  <text className={styles.hubCaption} x={HUB.x} y={HUB.y + 52}>
                    {hubCaption.toUpperCase()}
                  </text>
                ) : null}
              </>
            ) : null}

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
                    r={4}
                  />
                  <StudentMark x={city.x} y={city.y - 8} />
                  <g
                    className={styles.avatarBubble}
                    style={{ animationDelay: bobDelay }}
                  >
                    <circle className={styles.avatarCircle} cx={ax} cy={ay} r={18} />
                    <text className={styles.avatarText} x={ax} y={ay + 1}>
                      {initials}
                    </text>
                    {city.label ? (
                      <text className={styles.avatarLabel} x={ax} y={ay + 28}>
                        {city.label.toUpperCase()}
                      </text>
                    ) : null}
                  </g>
                </g>
              );
            })}
          </svg>

          {showStoryCard ? (
            <div className={styles.storyCard}>
              {storyEyebrow ? (
                <p className={styles.storyEyebrow}>{storyEyebrow}</p>
              ) : null}
              {storyTitle ? (
                <p className={styles.storyTitle}>{storyTitle}</p>
              ) : null}
              {storyBody ? (
                <p className={styles.storyBody}>{storyBody}</p>
              ) : null}
              {chipStudent || chipFlight || chipInternship ? (
                <div className={styles.storyChips}>
                  {chipStudent ? <span>{chipStudent}</span> : null}
                  {chipStudent && chipFlight ? (
                    <span className={styles.chipArrow} aria-hidden>
                      →
                    </span>
                  ) : null}
                  {chipFlight ? <span>{chipFlight}</span> : null}
                  {chipFlight && chipInternship ? (
                    <span className={styles.chipArrow} aria-hidden>
                      →
                    </span>
                  ) : null}
                  {chipInternship ? <span>{chipInternship}</span> : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {content?.currentRoutesLabel ||
      content?.currentRoutesItems?.length ||
      routeCodes.length ? (
        <RoutesMarqueeBar content={content} fallbackCodes={routeCodes} />
      ) : null}
    </section>
  );
}
