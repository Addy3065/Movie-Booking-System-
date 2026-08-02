const express = require("express");
const router = express.Router();
const { listMovies, showMovie } = require("../controllers/movieController");

router.get("/", listMovies); // GET /api/movies
router.get("/:id", showMovie); // GET /api/movies/:id

module.exports = router;
