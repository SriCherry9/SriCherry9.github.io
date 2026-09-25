'use strict';
// ============================================================
// TUTORIAL 4: JAVASCRIPT FUNDAMENTALS
// RSVP card — wire up the behavior
// ============================================================
//
// BEFORE YOU START: open the browser console (F12 → Console)
// You'll use it to check your work throughout.
//
// Run this any time to see the current state of your variables:
//   checkStatus()
//
// ============================================================

// ── 1. DATA: what are we tracking? ──────────────────────────
//
// These two variables represent the user's choice.
// Only one can be true at a time.
// (Later, think about whether you need both.)

let isGoing    = false;
let isNotGoing = false;

// ── 2. ELEMENTS ─────────────────────────────────────────────
const nameInput    = document.querySelector('#name-input');
const guestInput   = document.querySelector('#guest-input');
const guestField   = document.querySelector('#guest-field');
const btnYes       = document.querySelector('#btn-yes');
const btnNo        = document.querySelector('#btn-no');
const confirmation = document.querySelector('#confirmation');
const regret       = document.querySelector('#regret');
const total        = document.querySelector('#total');   // stretch

// ── 3. HELPERS: small functions that do one thing ───────────
//
// getName() returns the name from the input, or 'Someone' if it's empty.
// .trim() removes whitespace from both ends of a string.

const getName = () => {
  const raw = nameInput.value.trim();
  return raw || 'Someone';
   // What does || do here? If raw is an empty string (falsy), return 'Someone'.
};

// getGuests() returns the guest count as a NUMBER.
// Try: console.log(typeof guestInput.value) — what do you see?
// Number() converts the string "3" to the number 3.

const getGuests = () => {
  const n = Number(guestInput.value);
  return Number.isNaN(n) || n < 0 ? 0 : n;
};

// ── 4. TASK 1 & 2 ───────────────────────────────────────────
btnYes.addEventListener('click', () => {
  isGoing    = true;
  isNotGoing = false;

  btnYes.classList.add('active');
  btnNo.classList.remove('active');

  guestField.classList.remove('hidden');
  confirmation.classList.remove('hidden');
  regret.classList.add('hidden');

  updateConfirmation();
});

btnNo.addEventListener('click', () => {
  isGoing    = false;
  isNotGoing = true;

  btnNo.classList.add('active');
  btnYes.classList.remove('active');

  guestField.classList.add('hidden');
  total.classList.add('hidden');
  confirmation.classList.add('hidden');
  regret.classList.remove('hidden');

  updateRegret();
});

// ── 5. TASK 3 & 4 ───────────────────────────────────────────
const updateConfirmation = () => {
  const guests = getGuests();

  let guestLine;
  if (guests === 0) {
    guestLine = 'flying solo.';
  } else if (guests === 1) {
    guestLine = 'bringing 1 guest.';
  } else {
    guestLine = `bringing ${guests} guests.`;
  }

  confirmation.textContent = `${getName()} is coming — ${guestLine}`;
  updateTotal();
};

const updateRegret = () => {
  regret.textContent = `${getName()} can't make it. Maybe next time!`;
};

// Stretch: running total
const updateTotal = () => {
  const people = getGuests() + 1;
  const label  = people === 1 ? 'person' : 'people';
  total.textContent = `${people} ${label} confirmed so far`;
  total.classList.toggle('hidden', !isGoing);
};

// ── 6. TASK 5: live updates ─────────────────────────────────
nameInput.addEventListener('input', () => {
  if (isGoing) {
    updateConfirmation();
  } else if (isNotGoing) {
    updateRegret();
  }
});

guestInput.addEventListener('input', () => {
  if (isGoing) {
    updateConfirmation();
  }
});

// ── DEBUGGING ────────────────────────────────────────────────
//
// Type checkStatus() in the browser console to see current variable values.

const checkStatus = () => {
  console.log('=== current state ===');
  console.log('isGoing:    ', isGoing);
  console.log('isNotGoing: ', isNotGoing);
  console.log('name:       ', nameInput.value);
  console.log('guests:     ', getGuests(), '(type:', typeof getGuests(), ')');
  console.log('raw value:  ', guestInput.value, '(type:', typeof guestInput.value, ')');
  console.log('====================');
};

// Type resetCard() in the browser console to clear everything and start over.


const resetCard = () => {
  isGoing    = false;
  isNotGoing = false;
  nameInput.value  = '';
  guestInput.value = '0';
  btnYes.classList.remove('active');
  btnNo.classList.remove('active');
  guestField.classList.add('hidden');
  confirmation.classList.add('hidden');
  regret.classList.add('hidden');
  total.classList.add('hidden');
  confirmation.textContent = '';
  regret.textContent       = '';
  total.textContent        = '';
  console.log('Card reset.');
};
