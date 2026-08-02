const express = require("express");
const router = express.Router();
const { listShows, showShow } = require("../controllers/showController");

router.get("/", listShows); // GET /api/shows  or  /api/shows?movie_id=5
router.get("/:id", showShow); // GET /api/shows/:id

module.exports = router;
