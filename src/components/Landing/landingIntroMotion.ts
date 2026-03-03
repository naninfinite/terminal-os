import { gsap } from 'gsap';

export type LandingIntroNodes = {
  root: HTMLDivElement;
  frame: HTMLElement;
  scene: HTMLDivElement;
  field: HTMLDivElement;
  rainCanvas?: HTMLCanvasElement | null;
  glow: HTMLDivElement;
  grid: HTMLDivElement;
  sweep: HTMLDivElement;
  telemetry: HTMLDivElement;
  status: HTMLParagraphElement;
  button: HTMLButtonElement;
  flash: HTMLDivElement | null;
  desktopShell: HTMLDivElement;
  desktopRoot: HTMLElement | null;
  panels: HTMLElement[];
  statusBar: HTMLElement | null;
};

export type LandingIntroOptions = {
  reducedMotion: boolean;
  onComplete?: () => void;
};

const LANDING_INTRO_DURATION_MS = 3000;
const LANDING_INTRO_REDUCED_DURATION_MS = 120;

export const getLandingIntroDurationMs = (reducedMotion: boolean): number => (
  reducedMotion ? LANDING_INTRO_REDUCED_DURATION_MS : LANDING_INTRO_DURATION_MS
);

export const createLandingIntroTimeline = (
  nodes: LandingIntroNodes,
  options: LandingIntroOptions,
): gsap.core.Timeline => {
  const {
    root,
    frame,
    scene,
    field,
    rainCanvas,
    glow,
    grid,
    sweep,
    telemetry,
    status,
    button,
    flash,
    desktopShell,
    panels,
    statusBar,
  } = nodes;
  const { reducedMotion, onComplete } = options;
  const settleTargets = [...panels, statusBar].filter((target): target is HTMLElement => target != null);
  const desktopRevealProps = {
    autoAlpha: 1,
    scale: 1,
    filter: 'blur(0px) brightness(1) contrast(1)',
    clipPath: 'inset(0% 0% 0% 0% round 0px)',
  };

  if (reducedMotion) {
    gsap.set(desktopShell, {
      autoAlpha: 0,
      clipPath: 'inset(0% 0% 0% 0% round 0px)',
      filter: 'none',
      pointerEvents: 'none',
      scale: 1,
    });

    if (settleTargets.length > 0) {
      gsap.set(settleTargets, { autoAlpha: 1, y: 0 });
    }

    return gsap.timeline({
      defaults: { ease: 'none' },
      onComplete,
    })
      .to(root, { autoAlpha: 0, duration: 0.04 }, 0)
      .to(desktopShell, {
        autoAlpha: 1,
        duration: 0.08,
        pointerEvents: 'auto',
      }, 0);
  }

  gsap.set(desktopShell, {
    autoAlpha: 0,
    clipPath: 'inset(47% 0% 47% 0% round 10px)',
    filter: 'blur(18px) brightness(1.28) contrast(1.14)',
    pointerEvents: 'none',
    scale: 1.035,
    transformOrigin: '50% 50%',
  });
  gsap.set(scene, { scaleY: 1, transformOrigin: '50% 50%' });
  gsap.set(glow, { scale: 1, transformOrigin: '50% 50%' });
  gsap.set(field, { filter: 'brightness(1)' });
  if (rainCanvas) {
    gsap.set(rainCanvas, { autoAlpha: 1 });
  }

  if (flash) {
    gsap.set(flash, {
      autoAlpha: 0,
      scaleY: 0.02,
      transformOrigin: '50% 50%',
    });
  }

  if (settleTargets.length > 0) {
    gsap.set(settleTargets, {
      autoAlpha: 0.18,
      y: 18,
    });
  }

  const timeline = gsap.timeline({
    defaults: { ease: 'power2.out' },
    onComplete,
  })
    .to([button, status], {
      autoAlpha: 0.42,
      duration: 0.28,
    }, 0)
    .to(glow, {
      opacity: 1,
      scale: 1.18,
      duration: 0.42,
      ease: 'sine.out',
    }, 0)
    .to(grid, {
      opacity: 1,
      duration: 0.42,
    }, 0)
    .to(sweep, {
      opacity: 1,
      duration: 0.42,
    }, 0)
    .to(telemetry, {
      autoAlpha: 0.22,
      y: -6,
      duration: 0.32,
    }, 0.3)
    .to(field, {
      filter: 'brightness(1.72)',
      duration: 0.42,
      ease: 'power3.in',
    }, 0.8)
    .to(scene, {
      scaleY: 0.06,
      duration: 0.38,
      ease: 'power3.in',
    }, 0.98)
    .to(frame, {
      autoAlpha: 0.68,
      duration: 0.34,
    }, 1.02)
    .to(root, {
      autoAlpha: 0,
      duration: 0.94,
      ease: 'power1.inOut',
    }, 1.36)
    .to(desktopShell, {
      ...desktopRevealProps,
      duration: 1.2,
      ease: 'power3.out',
    }, 1.62)
    .set(desktopShell, { pointerEvents: 'auto' }, 2.5);

  if (rainCanvas) {
    timeline.to(rainCanvas, {
      autoAlpha: 0,
      duration: 0.9,
      ease: 'power1.out',
    }, 1.18);
  }

  if (flash) {
    timeline
      .to(flash, {
        autoAlpha: 0.92,
        scaleY: 1,
        duration: 0.12,
        ease: 'power2.out',
      }, 1.22)
      .to(flash, {
        autoAlpha: 0,
        duration: 0.24,
        ease: 'power1.in',
      }, 1.34);
  }

  if (panels.length > 0) {
    timeline.to(panels, {
      autoAlpha: 1,
      y: 0,
      duration: 0.38,
      stagger: 0.07,
      ease: 'power2.out',
    }, 2.22);
  }

  if (statusBar) {
    timeline.to(statusBar, {
      autoAlpha: 1,
      y: 0,
      duration: 0.36,
      ease: 'power2.out',
    }, 2.58);
  }

  return timeline;
};
