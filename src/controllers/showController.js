const { getAllShows, getShowById } = require("../queries/showQueries");
const { httpError } = require("../utils/httpError");
const { parsePositiveInt, parseString } = require("../utils/validate");

const listShows = async (req, res) => {
  const { movie_id, city } = req.query;
  const movieId =
    movie_id === undefined ? undefined : parsePositiveInt(movie_id, "movie_id");
  const cityFilter =
    city === undefined ? undefined : parseString(city, "city", { max: 100 });

  const shows = await getAllShows(movieId, cityFilter);
  res.json(shows);
};

const showShow = async (req, res) => {
  const id = parsePositiveInt(req.params.id, "id");
  const show = await getShowById(id);
  if (!show) {
    throw httpError(404, "Show not found");
  }
  res.json(show);
};

module.exports = { listShows, showShow };
