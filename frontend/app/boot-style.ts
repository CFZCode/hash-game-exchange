/* The pre-boot loader's stylesheet, verbatim from the Vite build's index.html (see the comment
   that sat above it there): it has to paint before any bundle has loaded, so app/layout inlines
   it into <head> rather than importing it. */
export const BOOT_CSS = `
      html {
        background-color: #232626;
      }

      body {
        background-color: #f4f4f4;
      }

      body.dark {
        background-color: #232626;
      }

      #start-up {
        width: 11rem;
        height: 11rem;
        background-image: url('/init-light.png');
        background-size: contain;
        position: fixed;
        top: 50%;
        z-index: 0;
        animation: init_heartBeat 0.6s infinite linear;
      }

      /* An 11rem box pulled back by half its own size. The original centres it with a
         negative margin rather than a translate because the transform property is already
         spoken for by the heartbeat animation. */
      [dir='ltr'] #start-up {
        left: 50%;
        margin: -5.5rem 0 0 -5.5rem;
      }

      [dir='rtl'] #start-up:not(:where([dir='ltr'], [dir='ltr'] *)) {
        right: 50%;
        margin: -5.5rem -5.5rem 0 0;
      }

      body.dark #start-up {
        background-image: url('/init-dark.png');
      }

      @keyframes init_heartBeat {
        0% {
          transform: scale(1);
        }
        50% {
          transform: scale(1.1);
        }
        100% {
          transform: scale(1);
        }
      }
    `;
