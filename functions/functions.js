const csv = require("csv-parser");
const fs = require("fs");
const query = require("../database/database.js");
module.exports = {
  data: [],
  dataFixed: {},

  // Here we read the static csv file with an async function
  async readStaticCsv() {
    var self = this;
    var fd = fs.createReadStream("rest_open_hours.csv - rest_open_hours.csv");
    return new Promise(function (resolve, reject) {
      fd.pipe(csv({ headers: "none" })).on("data", (row) => {
        self.data.push(row);
        resolve(row);
      });
      fd.on("error", reject);
    });
  },

  //Transform the data of the csv file
  fixJsonData() {
    return this.data.map((row, i) => {
      // Create an array with the string splited by separator
      stringSplited = row.o.split("/");
      let result = this.extractData(stringSplited, row.n);
      return result;
    });
  },

  //Operations to transfor the data
  extractData(array, name) {
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
        daySplit = this.setArrayDay(daySplit);
        newObjet.days = this.daysFormatDatabase(daySplit);
        hourFrom = this.fixHour(hourFrom);
        hourTo = this.fixHour(hourTo);
        newObjet.hourFrom = hourFrom;
        newObjet.hourTo = hourTo;
        newObjet.name = name;
        return newObjet;
      }
    });
  },

  //this function give you a good time format
  fixHour(hour) {
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
  },

  // Here we create an array with the days for an easier data process
  setArrayDay(array) {
    let unicDay;
    let composeDay = {};
    array.map((element, i) => {
      let trimElement = element.trim();
      if (trimElement.length > 3) {
        composeDay.start = this.parseDayToInt(trimElement.substring(0, 3));
        composeDay.end = this.parseDayToInt(trimElement.substring(4, 7));
      } else {
        unicDay = this.parseDayToInt(trimElement);
      }
    });
    let days = { composeDay, unicDay };
    return days;
  },

  //This function parse the days into a number
  parseDayToInt(day) {
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
  },

  // Concat the days in a string of numbers -> 0-6
  daysFormatDatabase(days) {
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
  },

  // It insert the data into the database
  async insertIntoTable(array) {
    await array.map(async (element, i) => {
      //onsole.log(element)
      await element.map(async (row) => {
        await query(
          "INSERT INTO restaurants(name, days, hourFrom, hourTo) VALUES (?, ?, ?, ?);",
          [row.name, row.days, row.hourFrom, row.hourTo]
        );
      });
    });
  },

  // This function create the table restaurants if not exist
  async createTable() {
    await query(
      "CREATE TABLE IF NOT EXISTS restaurants(id INT(255) UNSIGNED AUTO_INCREMENT PRIMARY KEY,name VARCHAR(255) NOT NULL, days VARCHAR(255) NOT NULL, hourFrom TIME NOT NULL, hourTo TIME NOT NULL);"
    );
    await this.insertIntoTable(dataFixed);
    console.log("Table restaurants has been created");
    return;
  },

  // this function check if exist table restaurants in the database
  async existTable() {
    var result = await query(
      "SELECT count(*) FROM information_schema.TABLES WHERE (TABLE_SCHEMA = 'sql4417332') AND (TABLE_NAME = 'restaurants')"
    );
    result = result[0]["count(*)"];
    return result;
  },
};
