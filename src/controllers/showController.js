const { getAllShows, getShowById } = require("../queries/showQueries");

const listShows = async (req, res) => {
  try {
    const { movie_id, city } = req.query; // GET /api/shows?movie_id=5&city=Amritsar
    const shows = await getAllShows(movie_id, city);
    res.json(shows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "error", message: "Failed to fetch shows" });
  }
};

const showShow = async (req, res) => {
  try {
    const show = await getShowById(req.params.id);
    if (!show) {
      return res
        .status(404)
        .json({ status: "error", message: "Show not found" });
    }
    res.json(show);
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "error", message: "Failed to fetch show" });
  }
};

module.exports = { listShows, showShow };
