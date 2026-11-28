import { isAppleMobile, type LocationProblem } from '../utils/gps.util';

interface Props {
  problem: LocationProblem;
  busy: boolean;
  onRetry: () => void;
}

const TEXT = {
  TITLE: '📍 Share your location to join this table',
  WHY: 'We check you are at the restaurant before you can order. It is only used for that check.',
  BTN_SHARE: 'Share my location',
  BTN_RETRY: 'Try again',
  BUSY: 'Checking your location…',
  DENIED: 'Location is blocked for this page. Turn it on, then tap Try again:',
  UNAVAILABLE: "We couldn't find your location. Turn on Location on your phone (and move near a window if you're indoors), then tap Share my location.",
  UNSUPPORTED: "This browser can't share your location. Open the QR link in Safari or Chrome.",
} as const;

const IPHONE_STEPS = [
  <>In Safari, tap <b>aA</b> in the address bar → <b>Website Settings</b> → <b>Location</b> → <b>Allow</b>.</>,
  <>Still blocked? Open <b>Settings → Privacy &amp; Security → Location Services</b>: turn it on and set <b>Safari Websites</b> (or <b>Chrome</b>) to <b>While Using the App</b>.</>,
];

const ANDROID_STEPS = [
  <>Tap the icon to the left of the web address → <b>Permissions</b> (or <b>Site settings</b>) → <b>Location</b> → <b>Allow</b>.</>,
  <>Make sure <b>Location</b> is switched on in your phone's quick settings.</>,
];

/** Shown when joining the table failed only because the browser didn't give us a location. */
const LocationCard = ({ problem, busy, onRetry }: Props) => {
  const denied = problem === 'DENIED';
  const unsupported = problem === 'UNSUPPORTED' || problem === 'INSECURE';
  return (
    <div className="info-card location-card">
      <strong>{TEXT.TITLE}</strong>
      <p>{TEXT.WHY}</p>
      {denied && (
        <>
          <p className="menu-error-text">{TEXT.DENIED}</p>
          <ol className="location-steps">
            {(isAppleMobile() ? IPHONE_STEPS : ANDROID_STEPS).map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </>
      )}
      {(problem === 'UNAVAILABLE' || problem === 'TIMEOUT') && <p>{TEXT.UNAVAILABLE}</p>}
      {unsupported ? (
        <p className="menu-error-text">{TEXT.UNSUPPORTED}</p>
      ) : (
        <button className="btn-primary" disabled={busy} onClick={onRetry}>
          {busy ? TEXT.BUSY : denied ? TEXT.BTN_RETRY : TEXT.BTN_SHARE}
        </button>
      )}
    </div>
  );
};

export default LocationCard;
