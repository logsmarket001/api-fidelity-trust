
const {mongoose} = require("mongoose")
const run = async () => {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/fidelitytrust_test").then(() => {
      console.log("connected")
    }).catch((err) => {
      console.log(err)
  }); // Change this to your connection string
  const collection = mongoose.connection.collection("transactions");
  const indexes = await collection.indexes();
  console.log(indexes); // Just to verify

  await collection.dropIndex("reference_1");
  console.log("Index on reference dropped");

  process.exit();
};

run().catch(console.error);
