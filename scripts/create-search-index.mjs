import mongoose from "mongoose";

async function createAtlasVectorIndex() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ Error: MONGODB_URI environment variable is missing.");
    process.exit(1);
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const collectionName = "ragchunks";
  const indexName = "rga_index";

  try {
    const existingIndexes = await db.collection(collectionName).listSearchIndexes().toArray();
    const alreadyExists = existingIndexes.some((idx) => idx.name === indexName);

    if (alreadyExists) {
      console.log(`✅ Search index '${indexName}' already exists on '${collectionName}'.`);
      await mongoose.disconnect();
      return;
    }

    console.log(`Creating Atlas Vector Search index '${indexName}' on collection '${collectionName}'...`);

    await db.collection(collectionName).createSearchIndex({
      name: indexName,
      type: "vectorSearch",
      definition: {
        fields: [
          {
            type: "vector",
            path: "embedding",
            numDimensions: 3072,
            similarity: "cosine",
          },
          {
            type: "filter",
            path: "serviceId",
          },
        ],
      },
    });

    console.log(`🎉 Search index '${indexName}' submitted successfully!`);
    console.log("⏳ Note: MongoDB Atlas may take 1-3 minutes to finish building the index.");
  } catch (err) {
    console.error("⚠️ Failed to create search index via driver:", err.message);
    console.log("\nYou can manually create the index in MongoDB Atlas UI:");
    console.log("1. Open MongoDB Atlas > Cluster > Atlas Search");
    console.log("2. Click 'Create Search Index' > Select 'Atlas Vector Search' (JSON Editor)");
    console.log(`3. Target Collection: ${collectionName}`);
    console.log(`4. Index Name: ${indexName}`);
    console.log(`5. Paste this JSON definition:\n`);
    console.log(
      JSON.stringify(
        {
          fields: [
            {
              type: "vector",
              path: "embedding",
              numDimensions: 3072,
              similarity: "cosine",
            },
            {
              type: "filter",
              path: "serviceId",
            },
          ],
        },
        null,
        2,
      ),
    );
  } finally {
    await mongoose.disconnect();
  }
}

createAtlasVectorIndex();
