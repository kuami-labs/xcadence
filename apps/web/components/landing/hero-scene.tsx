/**
 * Décor 3D de l'accroche, en CSS seul : une grille en perspective qui défile et des barres en
 * relief, dans les bleus du thème. Décoratif : masqué aux lecteurs d'écran, figé si
 * l'utilisateur limite les animations.
 */

// Barres posées sur la grille, de part et d'autre du titre : colonne, rangée, hauteur (px).
const BLOCKS: [number, number, number][] = [
  [6, 1, 70],
  [7, 1, 110],
  [8, 1, 90],
  [5, 2, 140],
  [7, 3, 180],
  [9, 2, 60],
  [6, 4, 120],
  [22, 1, 100],
  [23, 1, 60],
  [24, 2, 150],
  [21, 2, 80],
  [23, 3, 200],
  [25, 1, 120],
  [22, 4, 90],
];

const CELL = 88;
const SIZE = 44;

export function HeroScene() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 [mask-image:linear-gradient(to_bottom,transparent_0,#000_22%,#000_62%,transparent_92%)] [perspective-origin:50%_0] [perspective:1100px]"
    >
      <div
        className="absolute top-[150px] left-1/2 h-[1500px] w-[2640px] [transform-style:preserve-3d] motion-safe:animate-[xc-flow_7s_linear_infinite]"
        style={{
          transform: 'translateX(-50%) rotateX(70deg)',
          transformOrigin: '50% 0',
          backgroundImage:
            'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
          backgroundSize: `${CELL}px ${CELL}px`,
        }}
      >
        {BLOCKS.map(([col, row, height], i) => {
          const opacity = 0.55 + row * 0.1;
          return (
            <div
              key={i}
              className="absolute [transform-style:preserve-3d] motion-safe:animate-[xc-float_6s_ease-in-out_infinite]"
              style={{
                left: col * CELL,
                top: row * CELL,
                width: SIZE,
                height: SIZE,
                animationDelay: `-${(i * 0.7).toFixed(1)}s`,
              }}
            >
              <div
                className="absolute left-0 bg-chart-2"
                style={{
                  top: SIZE,
                  width: SIZE,
                  height,
                  opacity,
                  transformOrigin: 'top',
                  transform: 'rotateX(90deg)',
                }}
              />
              <div
                className="absolute top-0 left-0 bg-chart-3"
                style={{
                  width: height,
                  height: SIZE,
                  opacity,
                  transformOrigin: 'left',
                  transform: 'rotateY(-90deg)',
                }}
              />
              <div
                className="absolute top-0 bg-chart-4"
                style={{
                  left: SIZE,
                  width: height,
                  height: SIZE,
                  opacity,
                  transformOrigin: 'left',
                  transform: 'rotateY(-90deg)',
                }}
              />
              <div
                className="absolute top-0 left-0 bg-chart-1"
                style={{
                  width: SIZE,
                  height: SIZE,
                  opacity,
                  transform: `translateZ(${height}px)`,
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
