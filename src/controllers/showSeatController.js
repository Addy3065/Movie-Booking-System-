const { getSeatMapForShow } = require("../queries/showSeatQueries");

const getSeatMap = async (req, res) => {
  try {
    const seatMap = await getSeatMapForShow(req.params.showId);
    if (seatMap.length === 0) {
      return res
        .status(404)
        .json({ status: "error", message: "No seats found for this show" });
    }
    res.json(seatMap);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ status: "error", message: "Failed to fetch seat map" });
  }
};

module.exports = { getSeatMap };
