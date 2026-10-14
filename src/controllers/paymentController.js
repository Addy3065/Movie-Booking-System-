const { withTransaction } = require("../utils/transaction");
const { processPayment } = require("../queries/payments");

async function payHandler(req, res) {
  const { bookingId, simulate } = req.body || {};

  const result = await withTransaction((client) =>
    processPayment(client, { bookingId, simulate, userId: req.user.id }),
  );

  if (result.outcome === "expired") {
    return res.status(410).json({
      error: "Payment window expired; booking cancelled and seats released",
      bookingId: result.bookingId,
    });
  }

  if (result.outcome === "failed") {
    return res.status(402).json({
      error: "Payment failed; booking cancelled and seats released",
      paymentId: result.paymentId,
      bookingId: result.bookingId,
    });
  }

  return res.status(200).json({
    message: "Payment successful; booking confirmed",
    paymentId: result.paymentId,
    bookingId: result.bookingId,
    amount: result.amount,
  });
}

module.exports = { payHandler };
