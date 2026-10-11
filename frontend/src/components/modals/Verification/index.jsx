import React from 'react';
import { useNavigate } from 'react-router-dom';
import RouteDialog from '../../shared/RouteDialog';
import Select from '../../shared/Select';
import Input from '../../shared/Input';
import { showToast } from '../../shared/Toast/toast';
import { useSession } from '../../../context/session';
import {
  submitKyc,
  filesFor,
  getKycDocuments,
  readKycDocument,
  DOCUMENT_TYPES,
  MAX_FILE_BYTES,
  ACCEPT,
} from '../../../services/kyc';

/* `/settings/verify/:levelName` — `DialogVerificationCockpit` in the route registry, and THE ONE
 * SCREEN IN THIS PROJECT WHOSE BODY IS NOT A PORT. That is worth stating plainly rather than
 * leaving to be discovered:
 *
 * The original's cockpit is Sumsub's hosted WebSDK. `Cockpit-CxSiBuuQ.js` fetches an access token
 * from `/account/kyc/accessToken/?levelName=…`, hands it to `_.init(…)` and launches the whole
 * thing into `<div id="sumsub-websdk-container">`. Every field a bc.game visitor fills in belongs
 * to a third party and none of it is in any chunk — the same arrangement `/sports` has with
 * BetBy. There is nothing to transcribe.
 *
 * iBitPlay has no Sumsub integration, and instead takes the application itself on
 * `POST /user/kyc/submit`. So the form below is this build's own. What IS recovered, and is used
 * here rather than invented alongside it:
 *
 *   the route      `/settings/verify/:levelName`, from `Enter-MsmOuq5R.js`'s registry, mounted as
 *                  a dialog because it sits in the group closed with `dialog: !0`. It declares
 *                  no size, so it takes the manager's default (`{size: "s"}`) and renders at
 *                  `.pc .dialog-list`'s 30rem x 40rem. `[30, 12]` belongs to its SIBLING, the
 *                  country picker, and an earlier draft of this note put it here by mistake.
 *   the shell      `<div class="relative pt-4"><div class="min-h-80">` and the dialog title
 *                  "Personal Verification", both `Cockpit-CxSiBuuQ.js`'s own.
 *   the fields     not chosen here either: `kyc.validators.js` dictates all eight, their limits
 *                  and the document enum. The form asks for what the platform accepts and
 *                  nothing more.
 *
 * Everything else — the labels, the order, the two-column rows, the file tiles — is this build's,
 * written with the primitives the rest of Settings already uses so it reads as part of the same
 * site. `services/kyc.js` carries the endpoint's contract.
 *
 * `levelName` is taken but not sent: the platform's KYC has ONE level and no `level` field
 * anywhere in the module, which `docs/settings.md` records at length. It stays in the path because
 * the original's route has it and the Go buttons pass `basic-kyc-level`.
 */

const FIELD = 'mt-4 w-full';

/* The platform refuses a date of birth outside `age >= 18 && age <= 120` and says so in its own
   words. Checked here too, in those words, for the reason the password dialog checks its two
   rules on the client: the server's message is about its own rule and arrives after a round trip,
   and this one a visitor can fix while looking at the field.

   NOT enforced with the date input's `max` attribute, which would be the tidier answer: the
   shared `Input` forwards a fixed prop list and does not spread, and widening a primitive used
   across the project for one call site's convenience is the wrong trade. The server stays the
   authority either way. */
const UNDERAGE = 'You must be at least 18 years old';

function ageProblem(value) {
  if (!value) return '';
  const born = new Date(value);
  if (Number.isNaN(born.getTime())) return 'That date is not valid.';
  const years = (Date.now() - born.getTime()) / (365.25 * 24 * 3600 * 1000);
  if (years < 18) return UNDERAGE;
  if (years > 120) return 'That date of birth is not valid.';
  return '';
}

/* WHAT IS ALREADY ON FILE, above the form that would replace it.
 *
 * Reachable in the arm that matters: the pane disables its Go row while a submission is Pending
 * (`disabled={isPending}`, the original's own gate), and enables it once a submission is Rejected
 * — which is exactly when someone resubmitting wants to see what they sent last time.
 *
 * Each object URL is revoked on unmount. These are photographs of identity papers, so leaving one
 * pinned for the life of the document is the wrong default even though nothing else would notice.
 * A PDF cannot be drawn in an `<img>`, so it renders as a link that opens the blob instead. */
function OnFile({ kycId, documents }) {
  const [urls, setUrls] = React.useState({});

  React.useEffect(() => {
    let live = true;
    const made = [];
    const fields = Object.entries(documents ?? {})
      .filter(([, present]) => present)
      .map(([field]) => field);

    Promise.all(
      fields.map((field) => readKycDocument(kycId, field).then((url) => [field, url])),
    ).then((pairs) => {
      const next = Object.fromEntries(pairs.filter(([, url]) => url));
      Object.values(next).forEach((url) => made.push(url));
      if (live) setUrls(next);
      else made.forEach((url) => URL.revokeObjectURL(url));
    });

    return () => {
      live = false;
      made.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [kycId, documents]);

  const shown = Object.entries(urls);
  if (shown.length === 0) return null;

  return (
    <div className="mb-4 w-full rounded-lg bg-layer4 p-3">
      <p className="input-label">Documents on file</p>
      <div className="mt-2 flex gap-2">
        {shown.map(([field, url]) => (
          <a
            key={field}
            href={url}
            target="_blank"
            rel="noreferrer"
            className="flex h-24 flex-1 items-center justify-center overflow-hidden rounded-lg bg-layer5"
          >
            <img alt={field} src={url} className="max-h-full max-w-full object-contain" />
          </a>
        ))}
      </div>
    </div>
  );
}

function FileTile({ label, file, onPick, error }) {
  const id = React.useId();
  return (
    <div className="mt-3 w-full">
      <p className="input-label">{label}</p>
      <label
        htmlFor={id}
        className={`mt-1.5 flex h-24 w-full cursor-pointer items-center justify-center rounded-lg border border-dashed px-3 text-center text-sm ${
          error ? 'border-error text-error' : 'border-third text-secondary'
        }`}
      >
        {file ? (
          <span className="truncate font-semibold text-primary">{file.name}</span>
        ) : (
          <span>JPG, PNG or PDF — up to 5 MB</span>
        )}
      </label>
      <input
        id={id}
        type="file"
        className="hidden"
        accept={ACCEPT}
        onChange={(event) => onPick(event.target.files?.[0] ?? null)}
      />
    </div>
  );
}

export default function VerificationDialog({ onClose, onBack, enter }) {
  const navigate = useNavigate();
  const { session } = useSession();

  const [form, setForm] = React.useState({
    firstName: '',
    lastName: '',
    gender: '',
    dateOfBirth: '',
    address: '',
    city: '',
    /* Prefilled from `?country=`, which the country picker before this step writes — see
       `modals/VerifyEnter`. The original passes `?country=` only on its shufti arm, where the
       value configures a hosted SDK; here it fills a field, so it is carried on both arms and a
       visitor who has already answered "which country" does not answer twice. */
    country: new URLSearchParams(window.location.search).get('country') ?? session?.country ?? '',
    documentType: 'id_card',
  });
  const [files, setFiles] = React.useState({});
  const [error, setError] = React.useState('');
  const [pending, setPending] = React.useState(false);
  const [onFile, setOnFile] = React.useState(null);

  /* `status` carries `kycId` and which of the three documents exist, so the read below asks for
     nothing that is not there. Null when the account has never submitted, which is the common
     case and draws nothing. */
  React.useEffect(() => {
    let live = true;
    getKycDocuments().then((answer) => {
      if (live) setOnFile(answer);
    });
    return () => {
      live = false;
    };
  }, []);

  const set = (key) => (value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (error) setError('');
  };

  const wanted = filesFor(form.documentType);

  /* The button's own test, and it is the validator's required set: everything but `gender`, plus
     one file for each side the chosen document has. `gender` is `.optional()` there, so it is
     optional here — a form that demands more than the server does is a form that refuses
     applications the platform would have taken. */
  const complete =
    form.firstName.trim() &&
    form.lastName.trim() &&
    form.dateOfBirth &&
    form.address.trim() &&
    form.city.trim() &&
    form.country.trim().length >= 2 &&
    wanted.every((f) => files[f.field]);

  /* BOTH REFUSALS ARE THE SITE'S OWN WORDS, out of the i18n bundle rather than written here:
     "Upload file size exceeds __size__" (the account remote spells its own as
     "Upload file size exceeds 10MB", so the number is the only part that moves — this platform's
     `MAX_FILE_BYTES` is 5 MB) and "Please upload a common image format (e.g., JPG, PNG)", widened
     to name PDF because `ALLOWED_MIME` takes it and bc.game's own line does not.

     The type test is a courtesy, not the check. The platform reads MAGIC BYTES and refuses a
     renamed file whatever `accept` and `file.type` claim — see `services/kyc.js`. This only saves
     a round trip on the obvious case. */
  const pick = (field) => (file) => {
    if (!file) {
      setFiles((prev) => ({ ...prev, [field]: null }));
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError('Upload file size exceeds 5MB');
      return;
    }
    if (file.type && !ACCEPT.split(',').includes(file.type)) {
      setError('Please upload a common image format (e.g., JPG, PNG) or a PDF file');
      return;
    }
    setError('');
    setFiles((prev) => ({ ...prev, [field]: file }));
  };

  const submit = async () => {
    if (!complete || pending) return;

    const age = ageProblem(form.dateOfBirth);
    if (age) {
      setError(age);
      return;
    }

    setPending(true);
    setError('');
    try {
      /* Only the files the chosen type asks for — a passport application carrying an `idBack`
         would store a document the reviewer has no field for. */
      const send = {};
      wanted.forEach((f) => {
        if (files[f.field]) send[f.field] = files[f.field];
      });
      await submitKyc(form, send);
      showToast('Your documents have been submitted for review.');
      navigate(-1);
    } catch (failure) {
      setError(failure?.message || 'That submission was not accepted. Please check your details.');
      setPending(false);
    }
  };

  return (
    <RouteDialog title="Personal Verification" onClose={onClose} onBack={onBack} enter={enter}>
      {/* `L` in Cockpit-CxSiBuuQ.js — the shell the SDK mounts into, kept around the form. */}
      <div className="relative pt-4">
        <div className="min-h-80">
          {onFile ? <OnFile kycId={onFile.kycId} documents={onFile.documents} /> : null}

          <div className="flex w-full gap-x-3">
            <div className="w-1/2">
              <p className="input-label">First name</p>
              <Input value={form.firstName} onChange={set('firstName')} placeholder="First name" />
            </div>
            <div className="w-1/2">
              <p className="input-label">Last name</p>
              <Input value={form.lastName} onChange={set('lastName')} placeholder="Last name" />
            </div>
          </div>

          <p className={`${FIELD} input-label`}>Date of birth</p>
          <Input type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} />

          <p className={`${FIELD} input-label`}>Address</p>
          <Input value={form.address} onChange={set('address')} placeholder="Street address" />

          <div className="mt-4 flex w-full gap-x-3">
            <div className="w-1/2">
              <p className="input-label">City</p>
              <Input value={form.city} onChange={set('city')} placeholder="City" />
            </div>
            <div className="w-1/2">
              <p className="input-label">Country</p>
              <Input value={form.country} onChange={set('country')} placeholder="Country" />
            </div>
          </div>

          <p className={`${FIELD} input-label`}>Document type</p>
          <Select
            value={form.documentType}
            options={DOCUMENT_TYPES.map((d) => d.value)}
            onChange={(next) => {
              /* Changing the type changes which files are wanted, so the ones already picked for
                 the old type are dropped rather than left to be sent under a field the reviewer
                 will not look at. */
              setFiles({});
              set('documentType')(next);
            }}
            title="Document type"
            className="w-full bg-layer3"
          >
            {(value) => DOCUMENT_TYPES.find((d) => d.value === value)?.label ?? value}
          </Select>

          {wanted.map((f) => (
            <FileTile
              key={f.field}
              label={f.label}
              file={files[f.field] ?? null}
              onPick={pick(f.field)}
            />
          ))}

          {error ? <p className="mt-3 text-xs text-error">{error}</p> : null}

          <button
            type="button"
            className="button button-brand button-l mb-6 mt-4 w-full"
            disabled={!complete || pending}
            onClick={submit}
          >
            Submit
          </button>
        </div>
      </div>
    </RouteDialog>
  );
}
