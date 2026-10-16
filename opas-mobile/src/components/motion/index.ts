// Opas telekinetic motion library — the loading & gesture states from
// "Opas Motion — Loaders.dc.html", ported to Reanimated + react-native-svg.
// Every component honours `useReducedMotion()`.

export { OrbitLoader } from './OrbitLoader'; // 01 · The Orbit (full-page loader)
export { RedactionSkeleton } from './RedactionSkeleton'; // 02 · The Redaction (decoding record)
export { DecodeScramble } from './DecodeScramble'; // 03 · The Decode (Fi→En scramble)
export { AssemblyLoader } from './AssemblyLoader'; // 04 · The Assembly (save / upload)
export { PassageButton, type PassageState } from './PassageButton'; // 05 · The Passage (submit button)
export { PullToGather } from './PullToGather'; // 06 · The Gather (pull-to-refresh)
export { ScanLoader } from './ScanLoader'; // 09 · The Scan (camera OCR)
export { StreamingText } from './StreamingText'; // 13 · The Plain Words (streaming explanation)
export { CountdownRing } from './CountdownRing'; // 12 · The Countdown (deadline)
export { EmptyRecord } from './EmptyRecord'; // 11 · The Empty Record (first-run)
export { SnagError } from './SnagError'; // 10 · The Snag (error / retry)
export { Materialize } from './Materialize'; // 08 · Home materialise (staggered surface-in)
export { DotWave } from './DotWave'; // shared processing tail
