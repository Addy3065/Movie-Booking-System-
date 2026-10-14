const { httpError } = require("./httpError");

const INT_MAX = 2147483647;
const DIGITS = /^\d+$/;
const DECIMAL = /^\d+(\.\d+)?$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MAX_BYTES = 72;

function toInteger(value) {
  const plain =
    (typeof value === "number" && Number.isSafeInteger(value)) ||
    (typeof value === "string" && DIGITS.test(value));
  return plain ? Number(value) : NaN;
}

function parsePositiveInt(value, name) {
  const n = toInteger(value);
  if (!Number.isInteger(n) || n < 1 || n > INT_MAX) {
    throw httpError(400, `${name} must be a positive integer`);
  }
  return n;
}

function parseNonNegativeInt(value, name) {
  const n = toInteger(value);
  if (!Number.isInteger(n) || n < 0 || n > INT_MAX) {
    throw httpError(400, `${name} must be a non-negative integer`);
  }
  return n;
}

function parsePrice(value, name, { max }) {
  const plain =
    (typeof value === "number" && Number.isFinite(value)) ||
    (typeof value === "string" && DECIMAL.test(value));
  const cents = plain ? Math.round(Number(value) * 100) : NaN;

  if (!Number.isFinite(cents) || cents < 1 || cents > Math.round(max * 100)) {
    throw httpError(400, `${name} must be a positive number up to ${max}`);
  }
  return (cents / 100).toFixed(2);
}

function parseString(value, name, { min = 1, max }) {
  if (typeof value !== "string") {
    throw httpError(400, `${name} must be a string`);
  }
  const s = value.trim();
  if (s.length < min || s.length > max) {
    throw httpError(
      400,
      `${name} must be between ${min} and ${max} characters`,
    );
  }
  return s;
}

function parseEmail(value) {
  const email = parseString(value, "email", { max: 150 }).toLowerCase();
  if (!EMAIL.test(email)) {
    throw httpError(400, "email must be a valid email address");
  }
  return email;
}

function parsePassword(value, { min }) {
  if (typeof value !== "string") {
    throw httpError(400, "password must be a string");
  }
  if (value.length < min) {
    throw httpError(400, `password must be at least ${min} characters`);
  }
  if (Buffer.byteLength(value, "utf8") > PASSWORD_MAX_BYTES) {
    throw httpError(
      400,
      `password is too long (max ${PASSWORD_MAX_BYTES} bytes)`,
    );
  }
  return value;
}

module.exports = {
  parsePositiveInt,
  parseNonNegativeInt,
  parsePrice,
  parseString,
  parseEmail,
  parsePassword,
};
