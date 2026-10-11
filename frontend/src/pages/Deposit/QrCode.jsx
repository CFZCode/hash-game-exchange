import React from 'react';
import QRCode from 'qrcode';

/* `pg` in index-C1xohM7W.js — `<QrCodeImg url={address} size={140} logo={coinIcon(currency)}/>`,
 * its own chunk (`QrCodeImg-BMVeZCYd.js`) wrapping a bundled encoder. `qrcode` stands in for
 * that encoder; everything around it here is the original's arrangement.
 *
 * DRAWN TO A CANVAS RATHER THAN AN <img>, for the logo. The site punches the coin's mark into
 * the middle of the code, which needs a second draw pass over the finished modules — an SVG or
 * data-URL `<img>` would need the logo absolutely positioned on top, and that only lines up if
 * the two agree about the exact rendered size. One canvas is simpler and cannot drift.
 *
 * A QR code carries enough error correction to survive the hole: level M recovers ~15% of the
 * modules, and a logo at a fifth of the width covers 4% of the area. The site's own codes read
 * fine with the mark in place, so no correction level is forced beyond the library's default.
 *
 * `margin: 1` rather than the spec's 4-module quiet zone: the capture's code sits close to the
 * edge of its `rounded-xl bg-input_bright p-2` box, and the padding is doing that job instead.
 */
const SIZE = 140;

export default function QrCode({ value, logo, className = '' }) {
  const canvasRef = React.useRef(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !value) return undefined;

    /* Cancelled on unmount and on a value change: the encode is async, and a stale one landing
       after the address has switched would paint the previous coin's code. */
    let live = true;

    QRCode.toCanvas(canvas, value, {
      width: SIZE,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
    })
      .then(() => {
        if (!live || !logo) return;
        const context = canvas.getContext('2d');
        const image = new Image();
        image.onload = () => {
          if (!live) return;
          /* The canvas is drawn at device resolution by the library, so the logo has to be
             placed in its own pixel space rather than in CSS pixels. */
          const box = canvas.width / 5;
          const at = (canvas.width - box) / 2;
          context.fillStyle = '#ffffff';
          context.fillRect(at - 2, at - 2, box + 4, box + 4);
          context.drawImage(image, at, at, box, box);
        };
        image.src = logo;
      })
      .catch(() => {
        /* An address long enough to exceed the largest QR version throws rather than
           returning. Nothing to draw and nothing to say — the address is printed in full
           underneath either way, which is the part that matters. */
      });

    return () => {
      live = false;
    };
  }, [value, logo]);

  return <canvas ref={canvasRef} className={className} width={SIZE} height={SIZE} />;
}
