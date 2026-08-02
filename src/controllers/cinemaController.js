const { getAllCinemas, getCinemaById } = require("../queries/cinemaQueries");

const listCinemas = async (req, res) => {
  try {
    const cinemas = await getAllCinemas();
    res.json(cinemas);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ status: "error", message: "Failed to fetch cinemas" });
  }
};

const showCinema = async (req, res) => {
  try {
    const cinema = await getCinemaById(req.params.id);
    if (!cinema) {
      return res
        .status(404)
        .json({ status: "error", message: "Cinema not found" });
    }
    res.json(cinema);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ status: "error", message: "Failed to fetch cinema" });
  }
};

module.exports = { listCinemas, showCinema };
