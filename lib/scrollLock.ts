"use client";

// Reference-counted body scroll lock so a sheet/select opened on top
// of an already-open modal doesn't unlock scrolling out from under
// the modal underneath it when the inner one closes first.
let lockCount = 0;
let previousOverflow = "";

export function lockBodyScroll() {
  if (lockCount === 0) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  lockCount++;
}

export function unlockBodyScroll() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.overflow = previousOverflow;
  }
}
