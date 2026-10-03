const express = require("express");
const { requireAuth } = require("../middleware/auth");
const requireAdmin = require("../middleware/requireAdmin");
const {
  createMovieHandler,
  updateMovieHandler,
  deleteMovieHandler,
} = require("../controllers/adminMovieController");

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.post("/movies", createMovieHandler);
router.put("/movies/:id", updateMovieHandler);
router.delete("/movies/:id", deleteMovieHandler);

module.exports = router;
