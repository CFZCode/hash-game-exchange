/* The two drawings the notification drawer needs that no other module here already carries.
 *
 * `IconDoubleCheck` is inlined in `Main-_tXJgJzI.js` itself (template `ct`), which is why it has
 * no chunk of its own; `IconDelete` is `IconDelete-D_A0Wcow.js`, which IS in the saved mirror —
 * the same file `ClearAll-BQO1_4tO.js` imports for the Explore panel's Clear All row, though
 * that call site draws it from its own module.
 *
 * viewBox 0 0 32 32 and NO `fill`, like every other icon set in this project: the original's
 * wrapper prepends `.icon` (`fill: currentColor`) and these are the bare `<svg>`. Both call
 * sites here write `fill-brand` / `fill-secondary` explicitly, which is what the chunk does too.
 *
 * The panel's close cross and its chevron are NOT here — `components/shared/icons.jsx` already
 * carries both under the same paths, verified character for character against Header's `A` and
 * `Cc`. Kept there rather than duplicated, which is the rule the wallet rail's re-exports follow.
 */

const Icon = ({ className = '', ...rest }) => (
  <svg viewBox="0 0 32 32" className={className} {...rest} />
);

/* `ut` — two overlapping ticks, the "mark all as read" mark. Two paths in the original merged
   into one `d`; this is that single path verbatim. */
export const IconDoubleCheck = (props) => (
  <Icon {...props}>
    <path d="M8.24057 22.8683L2.20349 16.1965C2.04076 16.0112 1.95117 15.7741 1.95117 15.5288C1.95117 15.2834 2.04076 15.0463 2.20349 14.861L3.42316 13.5274C3.49887 13.441 3.59252 13.3717 3.69774 13.3242C3.80296 13.2767 3.9173 13.2521 4.03299 13.2521C4.14869 13.2521 4.26303 13.2767 4.36825 13.3242C4.47347 13.3717 4.56712 13.441 4.64283 13.5274L8.85337 18.1979L18.2352 7.80069C18.3109 7.71428 18.4045 7.64498 18.5097 7.59748C18.615 7.54997 18.7293 7.52539 18.845 7.52539C18.9607 7.52539 19.075 7.54997 19.1802 7.59748C19.2855 7.64498 19.3791 7.71428 19.4548 7.80069L20.6745 9.13621C20.8369 9.32092 20.9264 9.55735 20.9264 9.80202C20.9264 10.0467 20.8369 10.2831 20.6745 10.4678L9.46024 22.8683C9.38452 22.9547 9.29088 23.024 9.18566 23.0715C9.08043 23.119 8.96609 23.1436 8.8504 23.1436C8.73471 23.1436 8.62037 23.119 8.51515 23.0715C8.40992 23.024 8.31628 22.9547 8.24057 22.8683ZM14.5939 19.5685L17.5789 22.8683C17.9149 23.2354 18.4625 23.2354 18.7985 22.8683L30.0108 10.4659C30.1732 10.2812 30.2627 10.0447 30.2627 9.80007C30.2627 9.5554 30.1732 9.31897 30.0108 9.13426L28.7911 7.79873C28.7154 7.71233 28.6218 7.64302 28.5166 7.59552C28.4113 7.54802 28.297 7.52344 28.1813 7.52344C28.0656 7.52344 27.9513 7.54802 27.8461 7.59552C27.7408 7.64302 27.6472 7.71233 27.5715 7.79873L18.1897 18.1959L17.0135 16.8916L14.5939 19.5666V19.5685Z" />
  </Icon>
);

/* IconDelete-D_A0Wcow.js — the bin at the end of a notice row. */
export const IconDelete = (props) => (
  <Icon {...props}>
    <path d="M23.4576 12.8027C24.2971 12.8027 24.9774 13.4831 24.9774 14.3226C24.9774 14.4305 24.9661 14.5375 24.9435 14.6419L22.8712 24.2744C22.404 26.4467 20.4831 27.9988 18.2603 27.9988H12.6628C10.4399 27.9988 8.51988 26.4476 8.05183 24.2744L5.97952 14.6419C5.80292 13.8215 6.32491 13.0133 7.14531 12.8367C7.25057 12.814 7.35758 12.8027 7.46459 12.8027H23.4567H23.4576ZM17.9044 4.11679C20.825 4.63182 22.3257 6.46488 22.2517 9.28364L26.5486 10.0414C27.1898 10.1545 27.6178 10.7661 27.5047 11.4073L27.3864 12.078C27.2733 12.7192 26.6617 13.1472 26.0205 13.0341L5.89514 9.48548C5.25396 9.37238 4.82592 8.76078 4.93902 8.1196L5.05734 7.44884C5.17044 6.80766 5.78204 6.37962 6.42322 6.49272L12.0538 7.48451C12.9481 4.81104 14.9848 3.60176 17.9053 4.11592L17.9044 4.11679ZM14.3236 7.88557L19.9793 8.88258C19.928 7.40708 19.1433 6.64932 17.5077 6.36135C15.8721 6.07339 14.876 6.51621 14.3227 7.88557H14.3236Z" />
  </Icon>
);
