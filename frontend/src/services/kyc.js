import { request } from './client';
import { PLATFORM } from './endpoints';

/* KYC submission.
 *
 * ── THERE IS NO ORIGINAL FORM TO PORT, AND THAT IS THE FINDING ────────────────────────────────
 *
 * bc.game's `/settings/verify/:levelName` is `DialogVerificationCockpit`, and the whole of it is
 * SUMSUB'S HOSTED WEBSDK — recovered from `Cockpit-CxSiBuuQ.js`, which is:
 *
 *   _.init(container, () => get(`/account/kyc/accessToken/?levelName=${levelName}`))
 *     .withConf({lang, theme, country})
 *     .withOptions({addViewportTag: false, adaptIframeHeight: true})
 *     .build().launch("#sumsub-websdk-container")
 *
 * So the original ships a `<div id="sumsub-websdk-container">`, a spinner and an access-token
 * fetch, and every field a visitor fills in belongs to a third party. It is the same shape as
 * `/sports` being BetBy's app in a shadow root — see `docs/overview.md`.
 *
 * iBitPlay has no Sumsub integration and no access-token route. What it has is its own endpoint
 * taking the fields directly, so THE FORM ITSELF IS THIS BUILD'S, and it is the first screen here
 * that is. `docs/settings.md` records exactly what is recovered (the route, the dialog shell, the
 * "Personal Verification" title, the `pt-4` / `min-h-80` box) and what is not (every field, which
 * the platform's own validator dictates rather than this build choosing).
 *
 * ── WHAT THE PLATFORM TAKES ───────────────────────────────────────────────────────────────────
 *
 * `POST /user/kyc/submit` is MULTIPART, not JSON — `multer` with three named file fields beside
 * the text ones, so this is the one call in the project that hands `request` a `FormData` rather
 * than `json`. `send()` spreads `init` into `fetch` and only sets a Content-Type when `json` is
 * given, which is exactly what FormData needs: the browser writes the multipart boundary itself
 * and an explicit header would break it.
 *
 *   firstName     1..100
 *   lastName      1..100
 *   gender        OPTIONAL, one of male | female | other | prefer_not_to_say
 *   dateOfBirth   coerced to a Date and refused outside 18..120 years — "You must be at least 18
 *                 years old" is the platform's own message and the reason the field exists at
 *                 all; legacy did not check it
 *   address       1..500
 *   city          1..100
 *   country       2..100
 *   documentType  id_card | passport | driving_licence
 *
 * Files are `idFront`, `idBack` and `passport`, one each, 5 MB each, `image/jpeg`, `image/png` or
 * `application/pdf` — and the platform checks MAGIC BYTES rather than the declared mime, so a
 * renamed file is refused server-side however the picker labelled it. NONE of the three is
 * required by the service (each stores `?? null`), so which ones the form asks for is a matter of
 * what the document type means, not of what the endpoint enforces.
 */

/** The platform's own enum, in the order the form offers it. */
export const DOCUMENT_TYPES = [
  { value: 'id_card', label: 'ID Card' },
  { value: 'passport', label: 'Passport' },
  { value: 'driving_licence', label: 'Driving Licence' },
];

/** Which file fields a document type asks for. `passport` is one page; the other two have sides. */
export const filesFor = (documentType) =>
  documentType === 'passport'
    ? [{ field: 'passport', label: 'Passport page' }]
    : [
        { field: 'idFront', label: 'Front side' },
        { field: 'idBack', label: 'Back side' },
      ];

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const ACCEPT = 'image/jpeg,image/png,application/pdf';

/**
 * Submit the application.
 *
 * @param {object} fields the eight text fields above; `gender` may be omitted
 * @param {object} files  `{idFront?, idBack?, passport?}` of `File`
 */
export function submitKyc(fields, files = {}) {
  const form = new FormData();

  /* Only the keys the validator declares — it is not `.strict()`, but sending anything else would
     still be this build inventing a field the platform never reads. An absent `gender` is left
     out entirely rather than sent empty, because the enum has no empty member. */
  ['firstName', 'lastName', 'gender', 'dateOfBirth', 'address', 'city', 'country', 'documentType']
    .filter((key) => fields[key] !== undefined && fields[key] !== '')
    .forEach((key) => form.append(key, fields[key]));

  Object.entries(files).forEach(([field, file]) => {
    if (file) form.append(field, file, file.name);
  });

  return request(PLATFORM.user.kyc.submit, {
    live: true,
    method: 'POST',
    body: form,
    fixture: null,
  });
}

/* ── READING A SUBMITTED DOCUMENT BACK ─────────────────────────────────────────────────────────
 *
 * `GET /user/kyc/documents/:kycId/:field` serves the bytes, and TWO THINGS ABOUT IT SHAPE THIS.
 *
 * IT IS AUTHENTICATED, so unlike a banner image the URL cannot go into an `<img src>` — the
 * browser would fetch it without the bearer token and get a 401. `client.js` already answers a
 * non-JSON body as a `Blob` (`type.includes('json') ? res.json() : res.blob()`), and a Blob has
 * no `success` key so `unwrap` hands it straight back. So it is fetched like any other read and
 * turned into an object URL at the call site, which then owns revoking it.
 *
 * IT NEEDS A `kycId`, AND UNTIL NOW NOTHING TOLD A PLAYER THEIRS. `GET /user/kyc/status` returned
 * status, dates, the document type and which documents exist — and not the row's id. The document
 * route resolves the row, refuses unless the caller owns it, and answers the same `404` for "not
 * yours" as for "not found" so ids cannot be enumerated. All correct, and all of it meant the
 * route could only ever be exercised by staff. `kycId` was added to that response for this;
 * `docs/backend-gaps.md` Part 4b records the change.
 *
 * A field with no file answers `404 DOCUMENT_NOT_FOUND` — the same code as a foreign id — so an
 * absent document is a refusal to catch rather than an empty body to read. `status.documents`
 * says which of the three exist, so the caller knows before asking.
 */

/** `{kycId, documents:{idFront,idBack,passport}}` for the account's latest submission, or null. */
export const getKycDocuments = () =>
  Promise.resolve(request(PLATFORM.user.kyc.status, { live: true, fixture: null }))
    .then((answer) =>
      answer?.kycId
        ? { kycId: answer.kycId, documents: answer.documents ?? {}, status: answer.status }
        : null,
    )
    .catch(() => null);

/**
 * One document as an object URL, or null when there is none.
 *
 * THE CALLER MUST `URL.revokeObjectURL` IT. An object URL pins its Blob in memory for the life of
 * the document otherwise, and these are photographs of identity papers — the one kind of blob
 * worth being sure leaves memory when the screen that asked for it closes.
 */
export const readKycDocument = (kycId, field) =>
  Promise.resolve(request(PLATFORM.user.kyc.document(kycId, field), { live: true, fixture: null }))
    .then((blob) => (blob instanceof Blob ? URL.createObjectURL(blob) : null))
    .catch(() => null);

export default submitKyc;
