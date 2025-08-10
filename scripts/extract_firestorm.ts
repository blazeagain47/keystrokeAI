import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";
import path from "path";

// Re-use existing firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAAhuXmvIW9p7nL3mx6pW8FJc-vL8HyoBE",
  authDomain: "keystroke-ai-879a4.firebaseapp.com",
  projectId: "keystroke-ai-879a4",
  storageBucket: "keystroke-ai-879a4.firebasestorage.app",
  messagingSenderId: "727172748989",
  appId: "1:727172748989:web:b1004f353efae605f989d4",
  measurementId: "G-XGYT4PBXRM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

interface DatasetRecord {
  instruction: string;
  response: {
    speed: number;
    accuracy: number;
    focus: string[];
    confidence: number;
  };
}

function calculateCharDiff(typedText: string, targetText: string): string[] {
  const charErrors: Record<string, number> = {};
  
  // Compare character by character
  const maxLength = Math.max(typedText.length, targetText.length);
  
  for (let i = 0; i < maxLength; i++) {
    const typed = typedText[i] || '';
    const target = targetText[i] || '';
    
    if (typed !== target && target !== '') {
      // Count the target character that was missed/mistyped
      charErrors[target] = (charErrors[target] || 0) + 1;
    }
  }
  
  // Return top 5 most frequent errors, sorted by frequency desc
  return Object.entries(charErrors)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([char]) => char);
}

function processDocument(doc: any, collectionName: string): DatasetRecord | null {
  const data = doc.data();
  const docId = doc.id;
  
  // Check required fields
  if (typeof data.wpm !== 'number' || typeof data.accuracy !== 'number') {
    console.log(`⚠️  Skipping doc ${docId}: missing wpm or accuracy`);
    return null;
  }
  
  const wpm = data.wpm;
  const accuracy = data.accuracy;
  
  // Calculate speed and accuracy adjustments
  const speed = wpm >= 80 ? +1 : wpm < 40 ? -1 : 0;
  const accuracyAdj = accuracy < 90 ? +1 : accuracy >= 95 ? -1 : 0;
  
  // Calculate confidence
  const confidence = Number(
    (0.5 * Math.min(wpm, 120) / 120 + 0.5 * accuracy / 100).toFixed(2)
  );
  
  let instruction: string;
  let focus: string[] = [];
  
  if (collectionName === 'typingSessions') {
    // Use typedText if available
    if (data.typedText) {
      instruction = data.typedText;
      
      // Calculate focus if both typedText and targetText exist
      if (data.targetText) {
        focus = calculateCharDiff(data.typedText, data.targetText);
      }
    } else {
      instruction = `SESSION: ${wpm} WPM, ${accuracy}% accuracy`;
    }
  } else {
    // typing_results collection - fallback format
    instruction = `SESSION: ${wpm} WPM, ${accuracy}% accuracy`;
  }
  
  return {
    instruction,
    response: {
      speed,
      accuracy: accuracyAdj,
      focus,
      confidence
    }
  };
}

async function extractDataset() {
  console.log("🔥 Starting Firestore dataset extraction...\n");
  
  const collections = ['typingSessions', 'typing_results'];
  const allRecords: DatasetRecord[] = [];
  let totalProcessed = 0;
  let totalSkipped = 0;
  
  for (const collectionName of collections) {
    try {
      console.log(`📊 Processing collection: ${collectionName}`);
      
      const snapshot = await getDocs(collection(db, collectionName));
      
      if (snapshot.empty) {
        console.log(`   No documents found in ${collectionName}`);
        continue;
      }
      
      console.log(`   Found ${snapshot.size} documents`);
      
      snapshot.forEach((doc) => {
        const record = processDocument(doc, collectionName);
        if (record) {
          allRecords.push(record);
          totalProcessed++;
        } else {
          totalSkipped++;
        }
      });
      
    } catch (error) {
      console.error(`❌ Error processing collection '${collectionName}':`, error);
    }
  }
  
  // Ensure data directory exists
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // Write JSONL file
  const outputPath = path.join(dataDir, 'typing_dataset.jsonl');
  const jsonlContent = allRecords.map(record => JSON.stringify(record)).join('\n');
  
  fs.writeFileSync(outputPath, jsonlContent);
  
  console.log(`\n✅ Dataset written to data/typing_dataset.jsonl (${totalProcessed} records, ${totalSkipped} skipped)`);
  
  // Show sample records
  if (allRecords.length > 0) {
    console.log(`\n📝 Sample record:`);
    console.log(JSON.stringify(allRecords[0], null, 2));
  }
  
  console.log(`\n🎉 Extraction completed successfully!`);
}

// Run the extraction
extractDataset()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Extraction failed:", error);
    process.exit(1);
  });