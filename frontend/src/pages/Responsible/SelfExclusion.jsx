import React from 'react';

/* Self-exclusion — the fourth rail row.
 *
 * Copy, markup and both icons are from `index-CdxGH7-n.js` (`St`/`pt`). Each step is a
 * `flex overflow-hidden rounded-md bg-white_alpha10` strip with a `max-w-20` icon cell beside a
 * `p-3` body, and the agreement line is three spans with the middle one brand-green.
 *
 * THE ICONS ARE STATEFUL on the original — `fill-brand` once that step is reached
 * (`transStatus > 0` for the first, `> 2` for the second), `fill-secondary` before it. There is
 * no exclusion state to read here: `transStatus` comes off the account store and no endpoint is
 * wired, so both stay secondary, which is the untouched state the capture shows.
 *
 * The two intro paragraphs are NOT in the chunk — they resolve through i18n keys that are not
 * inlined — so those strings are read off the capture. Everything below them is verbatim.
 *
 * Continue is gated on the checkbox, which is the chunk's own condition
 * (`disabled: !checked || transStatus === 1 || …`). It does nothing on submit: the real flow
 * posts and then routes to `/exclusion/cooldown`, and neither is built.
 */

const INTRO = [
  'Are you seeking a break from BC.GAME? Initiate the automated self-exclusion process by establishing a limit, and you will be temporarily barred from accessing your account for the selected period. Please be aware that during this time, you will not have access to any products on the website, and any remaining balances will also be unavailable.',
  'You will receive an email to confirm your request.',
];

const CooldownIcon = () => (
  <svg viewBox="0 0 32 32" className="icon size-8 fill-secondary" aria-hidden="true">
    <path d="M19.1125 6.595H12.7545C12.3145 6.595 11.9625 6.243 11.9625 5.803C11.9625 5.363 12.3145 5 12.7545 5H19.1125C19.5525 5 19.9045 5.352 19.9045 5.792C19.9045 6.232 19.5525 6.595 19.1125 6.595Z" />
    <path d="M18.1335 24.767V21.533C18.1335 19.542 19.4755 18.2 21.4665 18.2H24.7005C24.9535 18.2 25.1955 18.222 25.4265 18.266C25.4485 18.002 25.4705 17.738 25.4705 17.463C25.4705 12.194 21.1915 7.915 15.9335 7.915C10.6755 7.915 6.39646 12.194 6.39646 17.463C6.39646 22.721 10.6755 27 15.9335 27C16.8685 27 17.7595 26.846 18.6175 26.604C18.3095 26.087 18.1335 25.471 18.1335 24.767ZM16.7585 17.1C16.7585 17.551 16.3845 17.925 15.9335 17.925C15.4825 17.925 15.1085 17.551 15.1085 17.1V11.6C15.1085 11.149 15.4825 10.775 15.9335 10.775C16.3845 10.775 16.7585 11.149 16.7585 11.6V17.1Z" />
    <path d="M24.7005 19.3H21.4775C20.0695 19.3 19.2335 20.136 19.2335 21.533V24.767C19.2335 26.164 20.0695 27 21.4775 27H24.7005C26.0975 27 26.9335 26.164 26.9335 24.767V21.533C26.9335 20.136 26.0975 19.3 24.7005 19.3ZM22.4455 24.866C22.4455 25.218 22.1595 25.504 21.7965 25.504C21.4445 25.504 21.1585 25.218 21.1585 24.866V21.434C21.1585 21.082 21.4445 20.796 21.7965 20.796C22.1595 20.796 22.4455 21.082 22.4455 21.434V24.866ZM25.0085 24.866C25.0085 25.218 24.7225 25.504 24.3705 25.504C24.0185 25.504 23.7215 25.218 23.7215 24.866V21.434C23.7215 21.082 24.0185 20.796 24.3705 20.796C24.7225 20.796 25.0085 21.082 25.0085 21.434V24.866Z" />
  </svg>
);

const ExclusionIcon = () => (
  <svg viewBox="0 0 32 32" className="icon size-8 fill-secondary" aria-hidden="true">
    <path d="M21.225 6.716V5C21.225 4.549 20.851 4.175 20.4 4.175C19.949 4.175 19.575 4.549 19.575 5V6.65H12.425V5C12.425 4.549 12.051 4.175 11.6 4.175C11.149 4.175 10.775 4.549 10.775 5V6.716C7.805 6.991 6.364 8.762 6.144 11.391C6.122 11.71 6.386 11.974 6.694 11.974H25.306C25.625 11.974 25.889 11.699 25.856 11.391C25.636 8.762 24.195 6.991 21.225 6.716Z" />
    <path d="M24.8 13.624H7.2C6.595 13.624 6.1 14.119 6.1 14.724V21.5C6.1 24.8 7.75 27 11.6 27H17.023C17.782 27 18.31 26.263 18.068 25.548C17.848 24.91 17.661 24.206 17.661 23.7C17.661 20.367 20.378 17.65 23.711 17.65C24.03 17.65 24.349 17.672 24.657 17.727C25.317 17.826 25.911 17.309 25.911 16.649V14.735C25.9 14.119 25.405 13.624 24.8 13.624ZM12.931 22.281C12.722 22.479 12.436 22.6 12.15 22.6C12.007 22.6 11.864 22.567 11.732 22.512C11.6 22.457 11.479 22.38 11.369 22.281C11.171 22.072 11.05 21.797 11.05 21.5C11.05 21.357 11.083 21.214 11.138 21.082C11.193 20.939 11.27 20.829 11.369 20.719C11.479 20.62 11.6 20.543 11.732 20.488C12.128 20.312 12.623 20.411 12.931 20.719C13.03 20.829 13.107 20.939 13.162 21.082C13.217 21.214 13.25 21.357 13.25 21.5C13.25 21.797 13.129 22.072 12.931 22.281ZM12.931 18.431C12.722 18.629 12.436 18.75 12.15 18.75C12.007 18.75 11.864 18.728 11.732 18.662C11.6 18.607 11.479 18.53 11.369 18.431C11.171 18.222 11.05 17.936 11.05 17.65C11.05 17.507 11.083 17.364 11.138 17.232C11.193 17.1 11.27 16.979 11.369 16.869C11.479 16.77 11.6 16.693 11.732 16.638C12.128 16.473 12.623 16.561 12.931 16.869C13.03 16.979 13.107 17.1 13.162 17.232C13.217 17.364 13.25 17.507 13.25 17.65C13.25 17.936 13.129 18.222 12.931 18.431ZM17.012 18.068C16.957 18.2 16.88 18.321 16.781 18.431C16.671 18.53 16.55 18.607 16.418 18.662C16.286 18.728 16.143 18.75 16 18.75C15.714 18.75 15.428 18.629 15.219 18.431C15.12 18.321 15.043 18.2 14.988 18.068C14.933 17.936 14.9 17.793 14.9 17.65C14.9 17.364 15.021 17.078 15.219 16.869C15.527 16.561 16.011 16.462 16.418 16.638C16.55 16.693 16.671 16.77 16.781 16.869C16.979 17.078 17.1 17.364 17.1 17.65C17.1 17.793 17.078 17.936 17.012 18.068Z" />
    <path d="M23.7 19.3C21.269 19.3 19.3 21.269 19.3 23.7C19.3 26.131 21.269 28.1 23.7 28.1C26.131 28.1 28.1 26.131 28.1 23.7C28.1 21.269 26.131 19.3 23.7 19.3ZM25.46 25.504C25.295 25.669 25.086 25.746 24.877 25.746C24.668 25.746 24.459 25.669 24.294 25.504L23.711 24.921L23.106 25.526C22.941 25.691 22.732 25.768 22.523 25.768C22.314 25.768 22.105 25.691 21.94 25.526C21.621 25.207 21.621 24.679 21.94 24.36L22.545 23.755L21.962 23.172C21.643 22.853 21.643 22.325 21.962 22.006C22.281 21.687 22.809 21.687 23.128 22.006L23.711 22.6L24.261 22.05C24.58 21.731 25.108 21.731 25.427 22.05C25.746 22.369 25.746 22.897 25.427 23.216L24.877 23.766L25.46 24.349C25.779 24.668 25.779 25.185 25.46 25.504Z" />
  </svg>
);

const STEPS = [
  {
    title: 'Step 1: Take a 24 Hours Cooldown',
    body: 'Take a 24 hours cooldown from betting from both casino and sports. You will still be able to access the platform and you can earn and claim rewards. During the 24 hours, you can change the type of cooldown but this will reset the 24 hour timer.',
    Icon: CooldownIcon,
  },
  {
    title: 'Step 2: Self-Exclusion',
    body: 'After your 24 hours cooldown ends, you have 24 hours to extend your self-exclusion period by 1 day, 1 week, 1 month, 6 months or permanently. If you self-exclude from the platform, you still able to log in to withdraw your asset. Self-exclusion is a STRICTLY IRREVERSIBLE process, NO ONE will be able to remove this for you.',
    Icon: ExclusionIcon,
  },
];

export default function SelfExclusion() {
  const [agreed, setAgreed] = React.useState(false);

  return (
    <div className="rounded-xl bg-layer4">
      {/* `help-center-box` with the intro as a `help-raw-html` section — the same document shell
          the FAQ's tab uses, NOT the bespoke `p-4` box Gambling Limits has. The two rows really
          are built differently. `font-semibold` is ours, standing in for the weight the
          unrecovered `.help-center-box` rule supplies. */}
      <div className="help-center-box help-doc p-4 font-semibold leading-normal text-secondary">
        <h2 className="text-sm font-extrabold text-primary">Self-Exclusion</h2>
        <div className="help-raw-html">
          <section>
            {INTRO.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </section>
        </div>

        {/* No top margin — it was `mt-4`, which collapsed against the intro paragraph's own
            12px bottom margin to give 16. Dropping it leaves that 12px as the whole gap; to go
            tighter than this the paragraph rule in Help.css has to come down, and that is shared
            with every document on both pages. */}
        <div className="w-full">
          {STEPS.map(({ title, body, Icon }, i) => (
            <div
              key={title}
              className={`flex overflow-hidden rounded-md bg-white_alpha10 ${i ? 'mt-3' : ''}`}
            >
              <div className="center flex max-w-20 flex-1 bg-layer5 px-6">
                <Icon />
              </div>
              <div className="flex-1 p-3">
                <div className="font-extrabold text-primary">{title}</div>
                <div className="mt-2 text-secondary">{body}</div>
              </div>
            </div>
          ))}

          {/* Three spans, the middle one brand-green — the chunk splits the sentence that way so
              only "rules of self-exclusion" is clickable. */}
          <div className="mt-3 flex items-center">
            {/* The site's own checkbox, not a hand-rolled box. `.checkbox-ico::before` draws
                the unchecked border in `--color-third` — the dull grey the capture shows — and
                goes transparent once selected, at which point the SVG's OWN stroked rounded
                square becomes the visible box. So the two states cross-fade rather than one
                element recolouring, which is why both have to be in the markup. The tick is the
                brand-green path the auth dialog uses. */}
            <button
              type="button"
              role="switch"
              aria-checked={agreed}
              onClick={() => setAgreed((v) => !v)}
              className="checkbox btn-like mr-2 !size-5"
            >
              <div className="checkbox-ico" {...(agreed ? { 'aria-selected': 'true' } : {})}>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  fill="none"
                  shapeRendering="geometricPrecision"
                >
                  <path
                    d="M7.77637 0.450195H10.2236C11.592 0.450195 12.592 0.450279 13.3799 0.514648C14.1622 0.5786 14.6969 0.703566 15.1426 0.930664C15.9721 1.35341 16.6466 2.02793 17.0693 2.85742C17.2965 3.30322 17.4214 3.83851 17.4854 4.62109C17.5497 5.40886 17.5498 6.4083 17.5498 7.77637V10.2236C17.5498 11.592 17.5497 12.592 17.4854 13.3799C17.4214 14.1622 17.2964 14.6969 17.0693 15.1426C16.6466 15.9721 15.9721 16.6466 15.1426 17.0693C14.6968 17.2965 14.1615 17.4214 13.3789 17.4854C12.5911 17.5497 11.5917 17.5498 10.2236 17.5498H7.77637C6.4083 17.5498 5.40886 17.5497 4.62109 17.4854C3.83851 17.4214 3.30322 17.2965 2.85742 17.0693C2.02793 16.6466 1.35341 15.9721 0.930664 15.1426C0.70352 14.6968 0.578588 14.1615 0.514648 13.3789C0.450319 12.5911 0.450195 11.5917 0.450195 10.2236V7.77637C0.450195 6.40801 0.450279 5.40796 0.514648 4.62012C0.5786 3.83779 0.703567 3.30313 0.930664 2.85742C1.35341 2.02793 2.02793 1.35341 2.85742 0.930664C3.30322 0.70352 3.83851 0.578588 4.62109 0.514648C5.40886 0.450319 6.4083 0.450195 7.77637 0.450195Z"
                    fill="none"
                    stroke="var(--color-brand)"
                    strokeWidth="1.5"
                  />
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M14.0382 6.8489L8.53208 12.5169C8.16569 12.8941 7.57165 12.8941 7.20526 12.5169L3.96191 9.1782C4.40027 8.64081 5.14907 7.94804 5.54815 7.60893L7.86867 9.94581C7.86867 9.94581 11.4664 6.12162 12.3331 5.22949C12.7841 5.63746 13.5819 6.31045 14.0382 6.8489Z"
                    fill="var(--color-brand)"
                  />
                </svg>
              </div>
            </button>
            {/* `text-primary` — plain white (#FFFFFF), brighter than the `secondary` this
                inherited from the pane. The green "rules of self-exclusion" span keeps its own
                colour. */}
            <div className="text-primary">
              <span>By requesting self-exclusion, I acknowledge the </span>
              <span className="mr-1 text-brand sm:cursor-pointer">rules of self-exclusion</span>
              <span>and take full responsibility</span>
            </div>
          </div>

          <button
            type="button"
            className="button button-brand button-m mt-3 w-full text-sm font-semibold text-primary_brand"
            disabled={!agreed}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
