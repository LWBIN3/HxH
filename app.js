const express = require("express");
const { MongoClient } = require("mongodb");
const path = require("path");

const app = express();
const port = 3000;

const uri = "mongodb://localhost:27017";
let client = null;

// 初始化資料庫連接
async function connectToDatabase() {
  try {
    client = new MongoClient(uri);
    await client.connect();
    console.log("Connected to MongoDB");
  } catch (e) {
    console.error("Could not connect to MongoDB:", e);
    process.exit(1);
  }
}

app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "project.html"));
});

app.get("/api/material", async (req, res) => {
  try {
    if (!client) {
      throw new Error("Database connection not established");
    }

    const database = client.db("material");
    const materials = database.collection("result");

    const result = await materials.find({}).toArray();
    // console.log(`Found ${result.length} documents`);

    res.json(result);
  } catch (e) {
    console.error("Error fetching materials:", e);
    res.status(500).json({
      error: "Error fetching data",
      details: e.message,
    });
  }
});

// 新增 infovisualize API endpoint
app.get("/api/infovisualize", async (req, res) => {
  try {
    if (!client) {
      throw new Error("Database connection not established");
    }

    const database = client.db("material");
    const infoCollection = database.collection("visual");

    const result = await infoCollection.find({}).toArray();
    // console.log(`Found ${result.length} documents in infovisualize collection`);

    res.json(result);
  } catch (e) {
    console.error("Error fetching infovisualize data:", e);
    res.status(500).json({
      error: "Error fetching data",
      details: e.message,
    });
  }
});

// 啟動伺服器
async function startServer() {
  await connectToDatabase();

  app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
  });
}

startServer().catch(console.error);

// 優雅地處理程序終止
process.on("SIGINT", async () => {
  if (client) {
    await client.close();
    console.log("MongoDB connection closed.");
  }
  process.exit(0);
});
