import { getDocs, collection, limit, query, orderBy, where } from "firebase/firestore";
import { db } from "../src/lib/firebase";

interface DatasetStats {
  totalDocuments: number;
  uniqueUsers: number;
  averageWPM: number;
  averageAccuracy: number;
  dateRange: {
    earliest: Date | null;
    latest: Date | null;
  };
  wpmDistribution: Record<string, number>;
  accuracyDistribution: Record<string, number>;
}

async function analyzeDataset() {
  console.log("📊 Analyzing Firestore dataset for ML training...\n");
  
  const collections = ["typingSessions", "typing_results"];
  const allStats: Record<string, DatasetStats> = {};
  
  for (const collectionName of collections) {
    try {
      console.log(`🔍 Analyzing collection: ${collectionName}`);
      console.log("=".repeat(60));
      
      // Get all documents (you might want to limit this for large datasets)
      const q = query(
        collection(db, collectionName), 
        orderBy("timestamp", "desc")
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        console.log("   No documents found in this collection.\n");
        continue;
      }
      
      const documents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Calculate statistics
      const stats = calculateStats(documents);
      allStats[collectionName] = stats;
      
      // Display results
      displayStats(collectionName, stats);
      
    } catch (error) {
      console.error(`❌ Error analyzing collection '${collectionName}':`, error);
    }
  }
  
  // Generate dataset summary
  console.log("\n📈 DATASET SUMMARY");
  console.log("=".repeat(60));
  
  const totalDocs = Object.values(allStats).reduce((sum, stats) => sum + stats.totalDocuments, 0);
  const totalUsers = new Set(
    Object.values(allStats).flatMap(stats => 
      Object.keys(stats.wpmDistribution)
    )
  ).size;
  
  console.log(`Total documents across all collections: ${totalDocs}`);
  console.log(`Total unique users: ${totalUsers}`);
  
  // Export recommendations
  console.log("\n💡 DATASET RECOMMENDATIONS");
  console.log("=".repeat(60));
  
  if (totalDocs < 100) {
    console.log("⚠️  Dataset is small (< 100 samples). Consider:");
    console.log("   - Collecting more typing sessions");
    console.log("   - Implementing data augmentation");
    console.log("   - Using transfer learning approaches");
  } else if (totalDocs < 1000) {
    console.log("📊 Dataset is moderate size. Consider:");
    console.log("   - Implementing cross-validation");
    console.log("   - Feature engineering for keystroke patterns");
    console.log("   - User-specific models");
  } else {
    console.log("🎉 Dataset is substantial! Ready for:");
    console.log("   - Deep learning models");
    console.log("   - Complex feature extraction");
    console.log("   - User behavior analysis");
  }
  
  console.log("\n✅ Dataset analysis complete!");
}

function calculateStats(documents: any[]): DatasetStats {
  const users = new Set<string>();
  const wpms: number[] = [];
  const accuracies: number[] = [];
  const timestamps: Date[] = [];
  
  documents.forEach(doc => {
    if (doc.userId) users.add(doc.userId);
    if (doc.wpm && typeof doc.wpm === 'number') wpms.push(doc.wpm);
    if (doc.accuracy && typeof doc.accuracy === 'number') accuracies.push(doc.accuracy);
    if (doc.timestamp) {
      const ts = doc.timestamp.toDate ? doc.timestamp.toDate() : new Date(doc.timestamp);
      timestamps.push(ts);
    }
  });
  
  // WPM distribution
  const wpmDistribution: Record<string, number> = {};
  wpms.forEach(wpm => {
    const range = getWPMRange(wpm);
    wpmDistribution[range] = (wpmDistribution[range] || 0) + 1;
  });
  
  // Accuracy distribution
  const accuracyDistribution: Record<string, number> = {};
  accuracies.forEach(acc => {
    const range = getAccuracyRange(acc);
    accuracyDistribution[range] = (accuracyDistribution[range] || 0) + 1;
  });
  
  return {
    totalDocuments: documents.length,
    uniqueUsers: users.size,
    averageWPM: wpms.length > 0 ? wpms.reduce((a, b) => a + b, 0) / wpms.length : 0,
    averageAccuracy: accuracies.length > 0 ? accuracies.reduce((a, b) => a + b, 0) / accuracies.length : 0,
    dateRange: {
      earliest: timestamps.length > 0 ? new Date(Math.min(...timestamps.map(t => t.getTime()))) : null,
      latest: timestamps.length > 0 ? new Date(Math.max(...timestamps.map(t => t.getTime()))) : null
    },
    wpmDistribution,
    accuracyDistribution
  };
}

function getWPMRange(wpm: number): string {
  if (wpm < 20) return "0-20 WPM";
  if (wpm < 40) return "20-40 WPM";
  if (wpm < 60) return "40-60 WPM";
  if (wpm < 80) return "60-80 WPM";
  if (wpm < 100) return "80-100 WPM";
  return "100+ WPM";
}

function getAccuracyRange(accuracy: number): string {
  if (accuracy < 70) return "0-70%";
  if (accuracy < 80) return "70-80%";
  if (accuracy < 90) return "80-90%";
  if (accuracy < 95) return "90-95%";
  return "95-100%";
}

function displayStats(collectionName: string, stats: DatasetStats) {
  console.log(`📊 Collection: ${collectionName}`);
  console.log(`   Total documents: ${stats.totalDocuments}`);
  console.log(`   Unique users: ${stats.uniqueUsers}`);
  console.log(`   Average WPM: ${stats.averageWPM.toFixed(2)}`);
  console.log(`   Average accuracy: ${stats.averageAccuracy.toFixed(2)}%`);
  
  if (stats.dateRange.earliest && stats.dateRange.latest) {
    console.log(`   Date range: ${stats.dateRange.earliest.toDateString()} to ${stats.dateRange.latest.toDateString()}`);
  }
  
  console.log("\n   WPM Distribution:");
  Object.entries(stats.wpmDistribution)
    .sort((a, b) => parseInt(a[0].split('-')[0]) - parseInt(b[0].split('-')[0]))
    .forEach(([range, count]) => {
      const percentage = ((count / stats.totalDocuments) * 100).toFixed(1);
      console.log(`     ${range}: ${count} (${percentage}%)`);
    });
  
  console.log("\n   Accuracy Distribution:");
  Object.entries(stats.accuracyDistribution)
    .sort((a, b) => parseInt(a[0].split('-')[0]) - parseInt(b[0].split('-')[0]))
    .forEach(([range, count]) => {
      const percentage = ((count / stats.totalDocuments) * 100).toFixed(1);
      console.log(`     ${range}: ${count} (${percentage}%)`);
    });
  
  console.log("");
}

// Run the analysis
analyzeDataset()
  .then(() => {
    console.log("🎉 Dataset analysis completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Dataset analysis failed:", error);
    process.exit(1);
  }); 