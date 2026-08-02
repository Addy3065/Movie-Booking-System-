const express = require("express");
const router = express.Router();
const { listCinemas, showCinema } = require("../controllers/cinemaController");

router.get("/", listCinemas); // GET /api/cinemas
router.get("/:id", showCinema); // GET /api/cinemas/:id

module.exports = router;
