import PopCenter from '../PopCenter';
import { useBrandName } from '../../../services/siteBranding';
import { startGoogleLogin } from '../../../services/googleAuth';

/* THIS BUILD'S — the confirmation the reference raises before a Google SIGN-UP (user's request,
 * 2026-10-31): the 18+ / Terms line and the restricted-jurisdiction line, then "Confirm & Sign up"
 * starts the Google flow. Signing IN with Google skips it. Used by the Sign Up tab and the home
 * hero's "Or Register With Google". */
export default function GoogleSignUpConfirm({ open, onClose }) {
  const brand = useBrandName();
  return (
    <PopCenter open={open} onClose={onClose} label="Confirm sign up" className="w-[min(25rem,calc(100vw-2rem))]">
      <div className="px-4 pb-4 text-sm font-semibold text-secondary">
        <p>
          I am 18+ and agree to the
          <a target="_blank" rel="noreferrer" href="/help/terms-service" className="mx-1 text-primary underline">
            Terms and Conditions
          </a>
        </p>
        <p className="mt-4">
          I confirm that I am not located in or accessing {brand} from a restricted jurisdiction as defined in the Terms of
          Service.
        </p>
        <button
          type="button"
          className="button button-brand button-l mt-5 h-11 w-full rounded-lg"
          onClick={() => {
            onClose();
            startGoogleLogin();
          }}
        >
          <span className="text-base">Confirm &amp; Sign up</span>
        </button>
      </div>
    </PopCenter>
  );
}
