const express = require("express");
const router = express.Router();
const query = require("../database/database.js");
const functions = require("../functions/functions.js");

// Get open restaurants with a query and return it
router.post("/getRestaurants", async (req, res) => {
  exist = await functions.existTable();
  console.log(exist)
  if (exist === 0) {
    if (functions.data.length === 0) {
      await functions.readStaticCsv();
    }
    dataFixed = functions.fixJsonData();
    await functions.createTable(dataFixed);
  }
  let day = req.body.day;
  let hour = req.body.hour;
  await query(
    "SELECT * FROM restaurants WHERE days LIKE ? AND ? <= hourTo AND ? >= hourFrom;",
    ["%" + day + "%", hour, hour],
    (err, response) => {
      if (err) {
        console.log(err);
        res.status(500).send(err);
      } else {
        res.status(200).send(response);
      }
    }
  );
});

// Drop table restaurants if exist
router.get("/dropTable", async (req, res) => {
  query("DROP TABLE IF EXISTS restaurants;", (err, row) => {
    if (err) {
      console.log(err);
      res.status(500).send(err);
    } else {
      console.log("Table has been droped");
      res.status(200).send("Table has been dropped");
    }
  });
});

// If table restaurant doesn't exist, it create a table and insert data from csv. The data is also transformed.
router.get("/createTable", async (req, res) => {
  if (functions.data.length === 0) {
    await functions.readStaticCsv();
  }
  exist = await functions.existTable();
  if (exist === 0) {
    dataFixed = functions.fixJsonData();
    await functions.createTable(dataFixed);
    res.send("Table has been created");
  } else {
    res.status(200).send("Table already exist");
  }
});

module.exports = router;
