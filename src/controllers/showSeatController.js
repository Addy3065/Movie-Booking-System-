const { getSeatMapForShow } = require("../queries/showSeatQueries");
const { httpError } = require("../utils/httpError");
const { parsePositiveInt } = require("../utils/validate");

const getSeatMap = async (req, res) => {
  const showId = parsePositiveInt(req.params.showId, "showId");
  const seatMap = await getSeatMapForShow(showId);
  if (seatMap.length === 0) {
    throw httpError(404, "No seats found for this show");
  }
  res.json(seatMap);
};

module.exports = { getSeatMap };
