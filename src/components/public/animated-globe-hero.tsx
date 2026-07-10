import Link from "next/link";
import type { PageHomeDocument } from "@/types/cms";
import styles from "./animated-globe-hero.module.css";

export interface AnimatedGlobeHeroProps {
  content: PageHomeDocument | null;
}

export function AnimatedGlobeHero({ content }: AnimatedGlobeHeroProps) {
  const pass = content?.boardingPass;
  const cities = content?.originCities ?? [];
  const routeCodes = cities.map((c) => c.code).filter(Boolean);

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
                <>
                  {" "}
                  <em className={styles.headlineEmphasis}>
                    {content.headlineEmphasis}
                  </em>
                </>
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
        </div>

        {pass &&
        (pass.routeLabel ||
          pass.passengerValue ||
          pass.classValue ||
          pass.refValue) ? (
          <div className={styles.boardingPass} aria-hidden={!pass.routeLabel}>
            <div className={styles.passMain}>
              {pass.routeLabel ? (
                <p className={styles.passRoute}>{pass.routeLabel}</p>
              ) : null}
              <div className={styles.passMeta}>
                {pass.passengerLabel || pass.passengerValue ? (
                  <div>
                    {pass.passengerLabel ? (
                      <span className={styles.passKey}>{pass.passengerLabel}</span>
                    ) : null}
                    {pass.passengerValue ? (
                      <span className={styles.passVal}>{pass.passengerValue}</span>
                    ) : null}
                  </div>
                ) : null}
                {pass.coachLabel || pass.coachValue ? (
                  <div>
                    {pass.coachLabel ? (
                      <span className={styles.passKey}>{pass.coachLabel}</span>
                    ) : null}
                    {pass.coachValue ? (
                      <span className={styles.passVal}>{pass.coachValue}</span>
                    ) : null}
                  </div>
                ) : null}
                {pass.statusLabel || pass.statusValue ? (
                  <div>
                    {pass.statusLabel ? (
                      <span className={styles.passKey}>{pass.statusLabel}</span>
                    ) : null}
                    {pass.statusValue ? (
                      <span className={styles.passStatus}>{pass.statusValue}</span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
            <div className={styles.passStub}>
              {pass.classLabel || pass.classValue ? (
                <div>
                  {pass.classLabel ? (
                    <span className={styles.passKey}>{pass.classLabel}</span>
                  ) : null}
                  {pass.classValue ? (
                    <span className={styles.passVal}>{pass.classValue}</span>
                  ) : null}
                </div>
              ) : null}
              {pass.refLabel || pass.refValue ? (
                <div>
                  {pass.refLabel ? (
                    <span className={styles.passKey}>{pass.refLabel}</span>
                  ) : null}
                  {pass.refValue ? (
                    <span className={styles.passVal}>{pass.refValue}</span>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
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
