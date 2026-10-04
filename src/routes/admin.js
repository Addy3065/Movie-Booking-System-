const express = require("express");
const { requireAuth } = require("../middleware/auth");
const requireAdmin = require("../middleware/requireAdmin");
const {
  createMovieHandler,
  updateMovieHandler,
  deleteMovieHandler,
} = require("../controllers/adminMovieController");
const {
  createShowHandler,
  deleteShowHandler,
} = require("../controllers/adminShowController");

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.post("/movies", createMovieHandler);
router.put("/movies/:id", updateMovieHandler);
router.delete("/movies/:id", deleteMovieHandler);

router.post("/shows", createShowHandler);
router.delete("/shows/:id", deleteShowHandler);

module.exports = router;
