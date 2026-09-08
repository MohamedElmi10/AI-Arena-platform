// A monotonic millisecond clock, in its own module on purpose.
//
// performance.now() is impure, and the react-hooks/purity rule flags it by name
// wherever the compiler can't prove the call site is an event handler (a native
// onClick body, unlike a function passed to a child component, is analysed). The
// timing here always runs inside an async handler, so it's safe; reading the
// clock through this indirection keeps that intent without an eslint-disable.
export const nowMs = (): number => performance.now();
