import React from 'react';
import {
  Award,
  ChevronLeft,
  ChevronRight,
  Download,
  Maximize2,
  Play,
  Pause,
  X,
} from 'lucide-react';
import { getAwardSnapshot, type AwardKey } from '@/lib/award-graphics';
import AwardAnimationRenderer, {
  AWARD_RENDER_KEYS,
} from '@/components/AwardAnimationRenderer';

const ORDER: AwardKey[] = AWARD_RENDER_KEYS;

export default function AwardAnimationScreenPage() {
  const [key, setKey] = React.useState<AwardKey>('best_player');
  const [playing, setPlaying] = React.useState(false);
  const [tick, setTick] = React.useState(0);
  const [downloading, setDownloading] = React.useState(false);

  const snapshot = React.useMemo(
    () => getAwardSnapshot(key),
    [key, tick]
  );

  React.useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 2500);
    return () => clearInterval(id);
  }, []);

  React.useEffect(() => {
    if (!playing) return;

    const id = setInterval(() => {
      setKey(
        (current) =>
          ORDER[(ORDER.indexOf(current) + 1) % ORDER.length]
      );
    }, 6500);

    return () => clearInterval(id);
  }, [playing]);

  const downloadCard = React.useCallback(async () => {
    if (downloading) return;

    setDownloading(true);

    try {
      const renderer = document.querySelector(
        '[data-wab-award-renderer="native"]'
      ) as HTMLElement | null;

      if (!renderer) {
        throw new Error('Award renderer was not found.');
      }

      const width = 1920;
      const height = 1080;

      const clone = renderer.cloneNode(true) as HTMLElement;

      clone
        .querySelectorAll('[data-wab-studio-ui], [data-wab-layer-id="award-vignette"]')
        .forEach((element) => element.remove());

      clone.style.position = 'fixed';
      clone.style.left = '-100000px';
      clone.style.top = '0';
      clone.style.width = `${width}px`;
      clone.style.height = `${height}px`;
      clone.style.transform = 'none';
      clone.style.overflow = 'hidden';
      clone.style.background = '#000';
      clone.style.pointerEvents = 'none';

      document.body.appendChild(clone);

      try {
        const serialized = new XMLSerializer().serializeToString(clone);

        const svg = `
          <svg xmlns="http://www.w3.org/2000/svg"
               xmlns:xlink="http://www.w3.org/1999/xlink"
               width="${width}"
               height="${height}"
               viewBox="0 0 ${width} ${height}">
            <foreignObject width="100%" height="100%">
              <div xmlns="http://www.w3.org/1999/xhtml"
                   style="width:${width}px;height:${height}px;background:#000;">
                ${serialized}
              </div>
            </foreignObject>
          </svg>
        `;

        const svgBlob = new Blob([svg], {
          type: 'image/svg+xml;charset=utf-8',
        });

        const svgUrl = URL.createObjectURL(svgBlob);

        try {
          const image = new Image();

          await new Promise<void>((resolve, reject) => {
            image.onload = () => resolve();
            image.onerror = () =>
              reject(new Error('Unable to render award card.'));
            image.src = svgUrl;
          });

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const context = canvas.getContext('2d');

          if (!context) {
            throw new Error('Canvas context is unavailable.');
          }

          context.fillStyle = '#000';
          context.fillRect(0, 0, width, height);
          context.drawImage(image, 0, 0, width, height);

          const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, 'image/png', 1)
          );

          if (!blob) {
            throw new Error('Unable to create award PNG.');
          }

          const url = URL.createObjectURL(blob);
          const anchor = document.createElement('a');

          anchor.href = url;
          anchor.download = `WAB-TKD-${key}-award-card.png`;
          document.body.appendChild(anchor);
          anchor.click();
          anchor.remove();

          URL.revokeObjectURL(url);
        } finally {
          URL.revokeObjectURL(svgUrl);
        }
      } finally {
        clone.remove();
      }
    } catch (error) {
      console.error('WAB-TKD award download failed:', error);

      /*
       * Keep the production UI usable even when a browser blocks
       * foreignObject/image rendering. The renderer itself remains intact.
       */
      const fallback = document.createElement('a');
      fallback.href = `data:text/plain;charset=utf-8,${encodeURIComponent(
        `WAB-TKD Award\n${snapshot?.title ?? key}\n${snapshot?.winner?.name ?? ''}`
      )}`;
      fallback.download = `WAB-TKD-${key}-award-info.txt`;
      fallback.click();
    } finally {
      setDownloading(false);
    }
  }, [downloading, key, snapshot]);

  if (!snapshot) {
    return (
      <div className="min-h-screen bg-black text-white grid place-items-center">
        NO AWARD DATA
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black text-white overflow-hidden">
      <AwardAnimationRenderer
        awardKey={key}
        playing={playing}
        controls
      />

      <div className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto rounded-xl border border-white/10 bg-black/55 backdrop-blur px-3 py-2 text-[10px] font-black tracking-wider text-[hsl(var(--gold))]">
          <Award size={13} className="inline mr-1" />
          WAB-TKD · AWARD ANIMATION
        </div>

        <div className="pointer-events-auto flex gap-1.5">
          <button
            onClick={() => setPlaying((v) => !v)}
            className="rounded-xl border border-white/10 bg-black/60 p-2"
            title={playing ? 'Pause' : 'Play'}
          >
            {playing ? <Pause size={15} /> : <Play size={15} />}
          </button>

          <button
            onClick={downloadCard}
            disabled={downloading}
            className="rounded-xl border border-white/10 bg-black/60 p-2 disabled:opacity-50"
            title="Download award card"
          >
            <Download size={15} />
          </button>

          <button
            onClick={() =>
              document.documentElement
                .requestFullscreen?.()
                .catch(() => {})
            }
            className="rounded-xl border border-white/10 bg-black/60 p-2"
            title="Fullscreen"
          >
            <Maximize2 size={15} />
          </button>

          <button
            onClick={() => window.close()}
            className="rounded-xl border border-white/10 bg-black/60 p-2"
            title="Close"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 rounded-2xl border border-white/10 bg-black/65 backdrop-blur p-2">
        <button
          onClick={() =>
            setKey(
              (current) =>
                ORDER[
                  (ORDER.indexOf(current) - 1 + ORDER.length) %
                    ORDER.length
                ]
            )
          }
          className="p-2 rounded-xl hover:bg-white/10"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="px-3 text-[9px] font-black tracking-[.18em]">
          {ORDER.indexOf(key) + 1} / {ORDER.length} · {snapshot.title}
        </div>

        <button
          onClick={() =>
            setKey(
              (current) =>
                ORDER[(ORDER.indexOf(current) + 1) % ORDER.length]
            )
          }
          className="p-2 rounded-xl hover:bg-white/10"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
