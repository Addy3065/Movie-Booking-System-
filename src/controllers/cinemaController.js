const { getAllCinemas, getCinemaById } = require("../queries/cinemaQueries");
const { httpError } = require("../utils/httpError");
const { parsePositiveInt } = require("../utils/validate");

const listCinemas = async (req, res) => {
  const cinemas = await getAllCinemas();
  res.json(cinemas);
};

const showCinema = async (req, res) => {
  const id = parsePositiveInt(req.params.id, "id");
  const cinema = await getCinemaById(id);
  if (!cinema) {
    throw httpError(404, "Cinema not found");
  }
  res.json(cinema);
};

module.exports = { listCinemas, showCinema };
