import { getDocs, collection, limit, query, orderBy } from "firebase/firestore";
import { db } from "../src/lib/firebase";

async function dumpSampleDocs() {
  const collections = ["typingSessions", "typing_results"];
  
  console.log("🔍 Inspecting Firestore collections for dataset building...\n");
  
  for (const collectionName of collections) {
    try {
      console.log(`📊 Collection: ${collectionName}`);
      console.log("=".repeat(50));
      
      const q = query(
        collection(db, collectionName), 
        orderBy("timestamp", "desc"),
        limit(10)
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        console.log("   No documents found in this collection.\n");
        continue;
      }
      
      console.log(`   Found ${snapshot.size} documents (showing latest 10):\n`);
      
      snapshot.forEach((doc, index) => {
        const data = doc.data();
        console.log(`   Document ${index + 1} (ID: ${doc.id}):`);
        console.log("   └─ Data:", JSON.stringify(data, null, 2));
        console.log("");
      });
      
    } catch (error) {
      console.error(`❌ Error accessing collection '${collectionName}':`, error);
    }
  }
  
  console.log("✅ Firestore inspection complete!");
}

// Run the inspection
dumpSampleDocs()
  .then(() => {
    console.log("🎉 Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Script failed:", error);
    process.exit(1);
  }); 