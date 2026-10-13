import { brandName } from '../../services/siteBranding';
import React from 'react';
import PopCenter from '../../components/shared/PopCenter';
import { IconBook, IconLink } from '../../components/shared/icons';

/* "How to make deposit?" — the link between the payment-method grid and the amount form, and
 * the guide behind it. `HowToDepositFiat-UEEoyF-D.js`, off `hash.game/assets/`, so every string
 * below is verbatim `e("…")` out of the chunk rather than read off a render.
 *
 * TWO WAYS IN, and the link picks its own icon from which one applies: a channel with an
 * `externalLink` opens that URL in a tab under a chain mark, and one with an inline guide opens
 * this dialog under a book. `W` is the test for the second — `guideUrl` parses to a non-empty
 * object, or `guideVideoUrl` is set — and it is the reason the live link is not always there.
 *
 * WHAT THIS BUILD CANNOT SUPPLY IS THE MEDIA, NOT THE COPY. `guideUrl` is a per-locale map of
 * PDF URLs and `guideVideoUrl` a video, both served with the channel from the authenticated
 * methods response. So the dialog renders its heading, its steps and — where the template says
 * so — the line announcing a video, and then nothing where the `<video>` and the PDF `<iframe>`
 * would be. The gate is moved to `guideTemplateType` accordingly, which is the one guide field
 * a channel here can honestly carry.
 *
 * `step-box` and `a-step` are DEAD CLASSES: neither is in the saved stylesheets nor in the
 * current deploy's `index-DaCxbF1r.css`, which was checked. Kept, like `header-nav-item` and
 * `f-ull` elsewhere.
 */

/* `_` — the guide table, all six templates. Only 1 is reachable from this project's channel
   fixture (it is the UPI one); the rest are kept for the reason the hero's three fallback
   banners are, since they cost nothing and are already correct.
   `__ENV_HOST__` is the deploy's own host, which the original interpolates at render. */
const HOST = brandName();

const GUIDES = {
  0: {
    title: 'How to make deposit',
    dialogTitle: ' ',
    desc: ' ',
    content: [],
    showVideo: false,
  },
  1: {
    title: 'How to make deposit',
    dialogTitle: 'UPI Deposit Instructions',
    desc: ' ',
    content: [
      { text: 'Finalize the transaction in your application.', align: 'center' },
      { text: `Go back to your browser or ${HOST} application.`, align: 'center' },
      { text: 'Deposit completed!', align: 'center' },
    ],
    showVideo: true,
  },
  2: {
    title: 'How to make deposit on AstroPay',
    dialogTitle: 'AstroPay Deposit Instructions',
    desc: 'AstroPay is a virtual wallet that facilitates online transactions securely and efficiently. AstroPay wallet offering a flexible and accessible payment solution for online gaming.',
    content: [
      {
        text: 'Select AstroPay on the deposit page, then, enter your AstroPay-registered mobile number.',
        align: 'start',
      },
      { text: 'Enter the 6-digit code sent by SMS to your AstroPay number.', align: 'center' },
      {
        text: 'From here, you can choose to pay with your AstroPay Wallet balance or AstroPay Voucher. If you wish to pay using other available payment methods, you may head to your AstroPay app and add funds to your wallet. Or, choose from the available selection and follow the steps to complete the payment.',
        align: 'start',
      },
      {
        text: 'If you have enough balance in your AstroPay wallet, you can choose to pay with your balance.',
        align: 'start',
      },
      {
        text: 'If you have a existing voucher, simply click on it or copy the 16-digit voucher code, then click Pay.',
        align: 'start',
      },
      { text: 'Deposit completed!', align: 'center' },
    ],
    showVideo: false,
  },
  3: {
    title: 'How to make deposit',
    dialogTitle: 'PIX Deposit Instructions',
    desc: ' ',
    content: [
      { text: 'Finalize the transaction in your application.', align: 'center' },
      { text: `Go back to your browser or ${HOST} application.`, align: 'center' },
      { text: 'Deposit completed!', align: 'center' },
    ],
    showVideo: true,
  },
  4: {
    title: 'How to make deposit on PicPay',
    dialogTitle: 'PicPay Deposit Instructions',
    desc: 'PicPay is a virtual wallet that facilitates online transactions securely and efficiently. PicPay wallet offering a flexible and accessible payment solution for online gaming.',
    content: [
      { text: 'Select Pix & input personal info.', align: 'center' },
      { text: 'Copy code.', align: 'center' },
      { text: "Select 'Pix Copiae Cola', copy & paste.", align: 'center' },
      { text: 'Deposit completed!', align: 'center' },
    ],
    showVideo: false,
  },
  5: {
    title: 'How to make deposit on Vcreditos',
    dialogTitle: 'Vcreditos Deposit Instructions',
    desc: 'Vcreditos is a virtual wallet that facilitates online transactions securely and efficiently. Vcreditos wallet offering a flexible and accessible payment solution for online gaming.',
    content: [
      {
        text: `Once ${HOST} is selected, the user must attach the QR code using the indicated button`,
        align: 'start',
      },
      {
        text: 'After attaching the QR code, the user must indicate the amount they want to transfer.',
        align: 'start',
      },
      {
        text: 'The user will be able to review the details of the transfer and indicate their VCreditos password to complete the transaction.',
        align: 'start',
      },
      { text: 'Receive confirmation of the transfer.', align: 'center' },
      { text: 'Deposit completed!', align: 'center' },
    ],
    showVideo: false,
  },
  6: {
    title: 'How to make deposit',
    dialogTitle: 'Deposit Instructions',
    desc: 'Please follow the steps to conduct the transaction. You can also refer to the provided PDF file or Video.',
    content: [
      {
        text: `After selecting ${HOST}, the user must use the indicated button to obtain transfer information.`,
        align: 'start',
      },
      {
        text: 'After attaching the transfer information, the user must indicate the amount they want to transfer.',
        align: 'start',
      },
      {
        text: 'Users will be able to view detailed information about the progress of transactions.',
        align: 'start',
      },
      { text: 'Receive confirmation of the transfer.', align: 'center' },
      { text: 'Deposit completed!', align: 'center' },
    ],
    showVideo: false,
  },
};

/* `Y` — one numbered step. The `align` field only ever chooses between two class lists, and
   `center` there is the site's own flex-centring helper rather than a text alignment. */
function Step({ index, text, align }) {
  return (
    <li className={align === 'start' ? 'mb-2.5 flex justify-start' : 'center mb-2.5 justify-start'}>
      <div className="center mr-2.5 h-8 w-8 flex-shrink-0 rounded-sm bg-layer3 text-xl font-extrabold leading-8">
        {index}
      </div>
      <div className="text-sm text-secondary">{text}</div>
    </li>
  );
}

function GuideDialog({ open, onClose, guide }) {
  return (
    <PopCenter
      open={open}
      onClose={onClose}
      title={guide.dialogTitle}
      className="mb-2 text-2xl text-primary"
    >
      <article className="pb-9">
        <header className="my-5 text-primary">
          <h2 className="mb-2 text-xl font-extrabold">{guide.title}</h2>
          <p className="text-sm text-secondary">{guide.desc}</p>
        </header>
        <section className="step-box">
          {guide.content.length > 0 && (
            <h3 className="mb-4 text-base font-extrabold text-primary">Deposit in a few steps:</h3>
          )}
          <ol className="list-none p-0">
            {guide.content.map((step, index) => (
              <Step key={step.text} index={index + 1} text={step.text} align={step.align} />
            ))}
          </ol>
          {/* The line that introduces the video, which is what sits above the `<video>` on the
              live page. It renders here with nothing under it, because the URL is part of the
              channel payload — see the header note. */}
          {guide.showVideo && <p className="a-step">A step-by-step instruction video</p>}
        </section>
      </article>
    </PopCenter>
  );
}

/* `ne` — the link. Rendered `class="ml-auto"` by `UD`, which is what floats it right; the
   button's own `justify-end text-right` does the same job again inside its box. */
export default function HowToDeposit({ channel, className = '' }) {
  const [open, setOpen] = React.useState(false);

  const external = channel?.externalLink;
  const guide = GUIDES[channel?.guideTemplateType];
  if (!external && !guide) return null;

  return (
    <>
      <button
        type="button"
        className={`center mb-4 mt-2 cursor-pointer justify-end text-right text-sm font-extrabold text-primary underline ${className}`}
        onClick={() => (external ? window.open(external, '_blank') : setOpen(true))}
      >
        {external ? (
          <IconLink className="icon mr-1.5 size-4 fill-primary" />
        ) : (
          <IconBook className="icon mr-1.5 size-4 fill-primary" />
        )}
        How to make deposit?
      </button>

      {guide && <GuideDialog open={open} onClose={() => setOpen(false)} guide={guide} />}
    </>
  );
}
