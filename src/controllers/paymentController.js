const { withTransaction } = require("../utils/transaction");
const { processPayment } = require("../queries/payments");

function sendError(res, err) {
  if (err.status) {
    const body = { error: err.message };
    if (err.unavailable) body.unavailable = err.unavailable;
    return res.status(err.status).json(body);
  }
  console.error(err);
  return res.status(500).json({ error: "Internal server error" });
}

async function payHandler(req, res) {
  const { bookingId, simulate } = req.body || {};

  try {
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
  } catch (err) {
    return sendError(res, err);
  }
}

module.exports = { payHandler };
