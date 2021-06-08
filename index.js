const csv = require("csv-parser");
const fs = require("fs");
const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql");
const { get } = require("http");
const app = express();
app.use(bodyParser.json());
const port = process.env.port || 3000;
var data = [];
dataFixed = {};

var connection = mysql.createConnection({
  host: "sql4.freesqldatabase.com",
  user: "sql4417332",
  password: "9JuCwXaPFQ",
  database: "sql4417332",
  port: "3306",
});
connection.connect((err) => {
  if (err) {
    throw err;
  } else {
    console.log("conected");
  }
});

app.post("/getRestaurants", (req, res) => {
  let day = req.body.day;
  let hour = req.body.hour;
  connection.query(
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

app.get("/dropTable", async (req, res) => {
  connection.query("DROP TABLE IF EXISTS restaurants;", (err, row) => {
    if (err) {
      console.log(err);
      res.status(500).send(err);
    } else {
      console.log("Table has been drop");
      res.status(200).send("Table has been drop");
    }
  });
});

app.get("/createTable", async (req, res) => {
  if (data.length === 0) {
    await readStaticCsv();
  }
  exist = await existTable();
  if (!exist) {
    dataFixed = fixJsonData();
    await createTable(dataFixed);
    console.log(dataFixed);
    res.send("Table has been created");
  } else {
    res.status(200).send("Table already exist");
  }
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});

// Here we read the static csv file with an async function
async function readStaticCsv() {
  var fd = fs.createReadStream("rest_open_hours.csv - rest_open_hours.csv");
  return new Promise(function(resolve, reject) {
    fd.pipe(csv({ headers: "none" })).on("data", (row) => {
      data.push(row);
      resolve(row);
    });
    fd.on("error", reject);
  });
}

function fixJsonData() {
  return data.map((row, i) => {
    // Create an array with the string splited by separator
    stringSplited = row.o.split("/");
    let result = extractData(stringSplited, row.n);
    return result;
  });
}

// Give a number to a week day Mon=0 ... Sun=6
function extractData(array, name) {
  return array.map((row, y) => {
    let newObjet = {};
    let index = null;
    let fixingDays = null;
    let fixingHours = null;
    [...row].forEach((element, i) => {
      if (parseInt(element) && index === null) {
        index = i - 1;
        return;
      }
    });
    if (index !== null) {
      fixingDays = row.substring(0, index);
      fixingHours = row.substring(index, row.length);
      let hourSplit = fixingHours.split("-");
      let hourFrom = hourSplit[0];
      let hourTo = hourSplit[1];
      hourFrom = hourFrom.trim();
      hourTo = hourTo.trim();
      let daySplit = fixingDays.split(",");
      daySplit = setArrayDay(daySplit);
      newObjet.days = daysFormatDatabase(daySplit);
      hourFrom = fixHour(hourFrom);
      hourTo = fixHour(hourTo);
      newObjet.hourFrom = hourFrom;
      newObjet.hourTo = hourTo;
      newObjet.name = name;
      return newObjet;
    }
  });
}
function fixHour(hour) {
  let hourWithOutPeriod = hour.substring(0, hour.length - 2);
  hourWithOutPeriod = hourWithOutPeriod.trim();
  hourWithOutPeriod = hourWithOutPeriod.replace(":", "");
  if (hourWithOutPeriod.length === 1) {
    hourWithOutPeriod = "0" + hourWithOutPeriod + "0000";
  } else if (hourWithOutPeriod.length === 2) {
    hourWithOutPeriod = hourWithOutPeriod + "0000";
  } else if (hourWithOutPeriod.length === 3) {
    hourWithOutPeriod = "0" + hourWithOutPeriod + "00";
  } else if (hourWithOutPeriod.length === 4) {
    hourWithOutPeriod = hourWithOutPeriod + "00";
  }
  if (hour.substring(hour.length - 2, hour.length) == "pm") {
    let newHour = parseInt(hourWithOutPeriod.substring(0, 2)) + 12;
    hourWithOutPeriod =
      newHour + hourWithOutPeriod.substring(2, hourWithOutPeriod.length);
  }
  return hourWithOutPeriod;
}

// Here we create an array with the days for an easier data process
function setArrayDay(array) {
  let unicDay;
  let composeDay = {};
  array.map((element, i) => {
    let trimElement = element.trim();
    if (trimElement.length > 3) {
      composeDay.start = parseDayToInt(trimElement.substring(0, 3));
      composeDay.end = parseDayToInt(trimElement.substring(4, 7));
    } else {
      unicDay = parseDayToInt(trimElement);
    }
  });
  let days = { composeDay, unicDay };
  return days;
}

function parseDayToInt(day) {
  if (day === "Mon") {
    return 0;
  } else if (day === "Tue") {
    return 1;
  } else if (day === "Wed") {
    return 2;
  } else if (day === "Thu") {
    return 3;
  } else if (day === "Fri") {
    return 4;
  } else if (day === "Sat") {
    return 5;
  } else if (day === "Sun") {
    return 6;
  }
}

function daysFormatDatabase(days) {
  result = "";
  if (Object.keys(days.composeDay).length > 0) {
    for (
      let index = days.composeDay.start;
      index <= days.composeDay.end;
      index++
    ) {
      result = result + "" + index;
    }
  } else {
    result = days.unicDay;
  }
  return result;
}

async function insertIntoTable(array) {
  return await new Promise(async (resolve, reject) => {
    await array.map((element, i) => {
      //onsole.log(element)
      element.map((row) => {
        return new Promise((resolve, reject) => {
          connection.query(
            "INSERT INTO restaurants(name, days, hourFrom, hourTo) VALUES (?, ?, ?, ?);",
            [row.name, row.days, row.hourFrom, row.hourTo],
            (err, row) => {
              if (err) {
                console.log(err);
                reject(err);
              } else {
                resolve();
                console.log("Insert done");
              }
            }
          );
        });
      });
    });
    resolve();
  });
}

async function createTable() {
  return await new Promise(function(resolve, reject) {
    connection.query(
      "CREATE TABLE IF NOT EXISTS restaurants(id INT(255) UNSIGNED AUTO_INCREMENT PRIMARY KEY,name VARCHAR(255) NOT NULL, days VARCHAR(255) NOT NULL, hourFrom TIME NOT NULL, hourTo TIME NOT NULL);",
      async (err, row) => {
        if (err) {
          reject();
          console.log(err);
        } else {
          console.log("Se ha creado la tabla");
          await insertIntoTable(dataFixed);
          resolve();
        }
      }
    );
  });
}

async function existTable() {
  return await new Promise(async function(resolve, reject) {
    let exist = false;
    connection.query("SELECT COUNT(*) from restaurants", (err, row) => {
      if (err) {
        if (err.errno !== 1146) {
          reject(err);
          console.log(err);
        }
      } else {
        exist = true;
      }
      resolve(exist);
    });
  });
}
